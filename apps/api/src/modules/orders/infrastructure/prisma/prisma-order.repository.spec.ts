import type { Order as PrismaOrder, OrderItem as PrismaOrderItem } from "@prisma/client";
import { PrismaOrderRepository } from "./prisma-order.repository";
import type { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

function fakeOrder(
  overrides: Partial<PrismaOrder> = {},
  items: PrismaOrderItem[] = [],
): PrismaOrder & { items: PrismaOrderItem[] } {
  return {
    id: "orden-1",
    clienteId: "cliente-1",
    tipo: "alquiler",
    estado: "pendiente_pago",
    fechaInicio: new Date("2026-09-01T00:00:00Z"),
    fechaFin: new Date("2026-09-05T00:00:00Z"),
    returnMode: "en_sede",
    direccionEntrega: "Calle 1",
    zonaId: "zona-1",
    ...overrides,
    items,
  } as PrismaOrder & { items: PrismaOrderItem[] };
}

function fakeItem(overrides: Partial<PrismaOrderItem> = {}): PrismaOrderItem {
  return {
    id: "item-1",
    orderId: "orden-1",
    unidadId: "unidad-1",
    tarifaAplicada: 40_000,
    ...overrides,
  } as PrismaOrderItem;
}

describe("PrismaOrderRepository", () => {
  let prisma: { order: Record<string, jest.Mock> };
  let repo: PrismaOrderRepository;

  beforeEach(() => {
    prisma = {
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    repo = new PrismaOrderRepository(prisma as unknown as PrismaService);
  });

  it("crear() mapea el input al schema de Prisma y devuelve la orden con items", async () => {
    prisma.order.create.mockResolvedValueOnce(fakeOrder({}, [fakeItem()]));

    const resultado = await repo.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: "zona-1",
      items: [{ unidadId: "unidad-1", tarifaAplicada: 40_000 }],
    });

    expect(prisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clienteId: "cliente-1",
        tipo: "alquiler",
        fechaInicio: new Date("2026-09-01"),
        fechaFin: new Date("2026-09-05"),
        items: { create: [{ unidadId: "unidad-1", tarifaAplicada: 40_000 }] },
      }),
      include: { items: true },
    });
    expect(resultado.id).toBe("orden-1");
    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0].unidad_id).toBe("unidad-1");
    expect(resultado.fecha_inicio).toBe("2026-09-01");
  });

  it("crear() con fechas null (venta) no las convierte a Date", async () => {
    prisma.order.create.mockResolvedValueOnce(
      fakeOrder({ tipo: "venta", fechaInicio: null, fechaFin: null }, [fakeItem()]),
    );

    await repo.crear({
      clienteId: "cliente-1",
      tipo: "venta",
      fechaInicio: null,
      fechaFin: null,
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: "zona-1",
      items: [{ unidadId: "unidad-1", tarifaAplicada: 100_000 }],
    });

    expect(prisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ fechaInicio: null, fechaFin: null }),
      include: { items: true },
    });
  });

  it("buscarPorId() devuelve la orden mapeada al dominio si existe", async () => {
    prisma.order.findUnique.mockResolvedValueOnce(fakeOrder({}, [fakeItem()]));

    const resultado = await repo.buscarPorId("orden-1");

    expect(prisma.order.findUnique).toHaveBeenCalledWith({
      where: { id: "orden-1" },
      include: { items: true },
    });
    expect(resultado?.cliente_id).toBe("cliente-1");
  });

  it("buscarPorId() devuelve null si no existe", async () => {
    prisma.order.findUnique.mockResolvedValueOnce(null);

    const resultado = await repo.buscarPorId("no-existe");

    expect(resultado).toBeNull();
  });

  it("obtenerUnidadesReservadasEnRango() consulta órdenes solapadas y aplana los unidad_id de sus items", async () => {
    prisma.order.findMany.mockResolvedValueOnce([
      fakeOrder({}, [fakeItem({ unidadId: "unidad-1" }), fakeItem({ id: "item-2", unidadId: "unidad-2" })]),
    ]);

    const resultado = await repo.obtenerUnidadesReservadasEnRango("modelo-1", "2026-09-01", "2026-09-05");

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tipo: "alquiler",
        estado: { in: ["pendiente_pago", "confirmada", "en_curso"] },
        items: { some: { unidad: { modeloId: "modelo-1" } } },
      }),
      include: { items: true },
    });
    expect(resultado).toEqual(["unidad-1", "unidad-2"]);
  });

  it("obtenerUnidadesConOrdenesActivas() aplana los unidad_id de órdenes activas del modelo", async () => {
    prisma.order.findMany.mockResolvedValueOnce([fakeOrder({}, [fakeItem({ unidadId: "unidad-9" })])]);

    const resultado = await repo.obtenerUnidadesConOrdenesActivas("modelo-1");

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        estado: { in: ["pendiente_pago", "confirmada", "en_curso"] },
        items: { some: { unidad: { modeloId: "modelo-1" } } },
      }),
      include: { items: true },
    });
    expect(resultado).toEqual(["unidad-9"]);
  });

  it("actualizarEstado() delega en prisma.order.update y devuelve el dominio actualizado", async () => {
    prisma.order.update.mockResolvedValueOnce(fakeOrder({ estado: "confirmada" }, [fakeItem()]));

    const resultado = await repo.actualizarEstado("orden-1", "confirmada");

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "orden-1" },
      data: { estado: "confirmada" },
      include: { items: true },
    });
    expect(resultado.estado).toBe("confirmada");
  });

  it("listarVencidasSinMora() filtra por estado activo y fecha_fin vencida", async () => {
    const ahora = new Date("2026-09-10T00:00:00Z");
    prisma.order.findMany.mockResolvedValueOnce([fakeOrder({}, [fakeItem()])]);

    const resultado = await repo.listarVencidasSinMora(ahora);

    expect(prisma.order.findMany).toHaveBeenCalledWith({
      where: {
        estado: { in: ["confirmada", "en_curso"] },
        fechaFin: { lt: ahora },
      },
      include: { items: true },
    });
    expect(resultado).toHaveLength(1);
  });

  it("extenderFecha() actualiza fecha_fin y devuelve la orden mapeada", async () => {
    prisma.order.update.mockResolvedValueOnce(
      fakeOrder({ fechaFin: new Date("2026-09-08") }, [fakeItem()]),
    );

    const resultado = await repo.extenderFecha("orden-1", "2026-09-08");

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "orden-1" },
      data: { fechaFin: new Date("2026-09-08") },
      include: { items: true },
    });
    expect(resultado.fecha_fin).toBe("2026-09-08");
  });
});
