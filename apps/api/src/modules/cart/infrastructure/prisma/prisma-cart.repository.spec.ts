import { PrismaCartRepository } from "./prisma-cart.repository";
import type { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

describe("PrismaCartRepository", () => {
  let prisma: {
    cart: { upsert: jest.Mock };
    cartItem: { deleteMany: jest.Mock; createMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let repo: PrismaCartRepository;

  beforeEach(() => {
    prisma = {
      cart: { upsert: jest.fn() },
      cartItem: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn(),
    };
    repo = new PrismaCartRepository(prisma as unknown as PrismaService);
  });

  it("obtenerOCrearPorClienteId() hace upsert por clienteId y mapea los items al dominio", async () => {
    prisma.cart.upsert.mockResolvedValueOnce({
      id: "cart-1",
      clienteId: "cliente-1",
      items: [
        { id: "item-1", cartId: "cart-1", modeloId: "modelo-1", cantidad: 2, dias: 3 },
        { id: "item-2", cartId: "cart-1", modeloId: "modelo-2", cantidad: 1, dias: null },
      ],
    });

    const resultado = await repo.obtenerOCrearPorClienteId("cliente-1");

    expect(prisma.cart.upsert).toHaveBeenCalledWith({
      where: { clienteId: "cliente-1" },
      create: { clienteId: "cliente-1" },
      update: {},
      include: { items: true },
    });
    expect(resultado).toEqual({
      clienteId: "cliente-1",
      items: [
        { modelo_id: "modelo-1", cantidad: 2, dias: 3 },
        { modelo_id: "modelo-2", cantidad: 1, dias: null },
      ],
    });
  });

  it("guardarItems() reemplaza las líneas del carrito dentro de una transacción cuando hay items", async () => {
    prisma.cart.upsert.mockResolvedValueOnce({ id: "cart-1", clienteId: "cliente-1" });
    prisma.$transaction.mockResolvedValueOnce([{ count: 1 }, { count: 2 }]);

    const items = [
      { modelo_id: "modelo-1", cantidad: 2, dias: 3 },
      { modelo_id: "modelo-2", cantidad: 1, dias: null },
    ];

    const resultado = await repo.guardarItems("cliente-1", items);

    expect(prisma.cart.upsert).toHaveBeenCalledWith({
      where: { clienteId: "cliente-1" },
      create: { clienteId: "cliente-1" },
      update: {},
    });
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: "cart-1" } });
    expect(prisma.cartItem.createMany).toHaveBeenCalledWith({
      data: [
        { cartId: "cart-1", modeloId: "modelo-1", cantidad: 2, dias: 3 },
        { cartId: "cart-1", modeloId: "modelo-2", cantidad: 1, dias: null },
      ],
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ clienteId: "cliente-1", items });
  });

  it("guardarItems() con lista vacía solo ejecuta el deleteMany dentro de la transacción (sin createMany)", async () => {
    prisma.cart.upsert.mockResolvedValueOnce({ id: "cart-1", clienteId: "cliente-1" });
    prisma.$transaction.mockResolvedValueOnce([{ count: 0 }]);

    const resultado = await repo.guardarItems("cliente-1", []);

    expect(prisma.cartItem.createMany).not.toHaveBeenCalled();
    const opsPasadasATransaction = prisma.$transaction.mock.calls[0][0] as unknown[];
    expect(opsPasadasATransaction).toHaveLength(1);
    expect(resultado).toEqual({ clienteId: "cliente-1", items: [] });
  });
});
