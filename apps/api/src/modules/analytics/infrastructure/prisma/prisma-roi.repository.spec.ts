import { PrismaRoiRepository } from "./prisma-roi.repository";
import type { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

describe("PrismaRoiRepository", () => {
  let prisma: { toolModel: { findMany: jest.Mock }; payment: { findMany: jest.Mock } };
  let repo: PrismaRoiRepository;

  beforeEach(() => {
    prisma = {
      toolModel: { findMany: jest.fn() },
      payment: { findMany: jest.fn() },
    };
    repo = new PrismaRoiRepository(prisma as unknown as PrismaService);
  });

  it("devuelve [] sin consultar payments si no hay modelos", async () => {
    prisma.toolModel.findMany.mockResolvedValueOnce([]);

    const resultado = await repo.listarConIngresos();

    expect(resultado).toEqual([]);
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });

  it("acumula los ingresos capturados por modelo (órdenes de 1 solo ítem: todo el pago va a ese modelo)", async () => {
    prisma.toolModel.findMany.mockResolvedValueOnce([
      { id: "modelo-1", costoCompra: 300_000 },
      { id: "modelo-2", costoCompra: null },
    ]);
    prisma.payment.findMany.mockResolvedValueOnce([
      { monto: 40_000, order: { items: [{ tarifaAplicada: 40_000, unidad: { modeloId: "modelo-1" } }] } },
      { monto: 20_000, order: { items: [{ tarifaAplicada: 20_000, unidad: { modeloId: "modelo-1" } }] } },
      { monto: 100_000, order: { items: [] } }, // sin items: se ignora
    ]);

    const resultado = await repo.listarConIngresos();

    expect(resultado).toEqual([
      { modeloId: "modelo-1", costoCompra: expect.objectContaining({}), ingresosAcumulados: expect.objectContaining({}) },
      { modeloId: "modelo-2", costoCompra: null, ingresosAcumulados: expect.objectContaining({}) },
    ]);
    const modelo1 = resultado.find((m) => m.modeloId === "modelo-1")!;
    const modelo2 = resultado.find((m) => m.modeloId === "modelo-2")!;
    expect(modelo1.ingresosAcumulados.valor).toBe(60_000);
    expect(modelo1.costoCompra?.valor).toBe(300_000);
    expect(modelo2.ingresosAcumulados.valor).toBe(0);
    expect(modelo2.costoCompra).toBeNull();
  });

  it("orden multi-ítem (checkout consolidado, HU-12.3): prorratea el pago entre los modelos de la orden según su tarifaAplicada", async () => {
    prisma.toolModel.findMany.mockResolvedValueOnce([
      { id: "modelo-1", costoCompra: null },
      { id: "modelo-2", costoCompra: null },
    ]);
    // 1 pago de 100.000 sobre una orden con 2 ítems: modelo-1 pesó 40.000 de
    // tarifa, modelo-2 pesó 60.000 -> se reparte 40%/60% -> 40.000/60.000.
    prisma.payment.findMany.mockResolvedValueOnce([
      {
        monto: 100_000,
        order: {
          items: [
            { tarifaAplicada: 40_000, unidad: { modeloId: "modelo-1" } },
            { tarifaAplicada: 60_000, unidad: { modeloId: "modelo-2" } },
          ],
        },
      },
    ]);

    const resultado = await repo.listarConIngresos();

    const modelo1 = resultado.find((m) => m.modeloId === "modelo-1")!;
    const modelo2 = resultado.find((m) => m.modeloId === "modelo-2")!;
    expect(modelo1.ingresosAcumulados.valor).toBe(40_000);
    expect(modelo2.ingresosAcumulados.valor).toBe(60_000);
  });

  it("filtra por modeloId cuando se provee, incluyendo el where en toolModel y payment", async () => {
    prisma.toolModel.findMany.mockResolvedValueOnce([{ id: "modelo-1", costoCompra: 300_000 }]);
    prisma.payment.findMany.mockResolvedValueOnce([]);

    await repo.listarConIngresos("modelo-1");

    expect(prisma.toolModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "modelo-1" } }),
    );
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: { items: { some: { unidad: { modeloId: "modelo-1" } } } },
        }),
      }),
    );
  });
});
