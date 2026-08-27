import type { PrismaClient } from "@prisma/client";
import { ejecutarMoraCalculatorJob } from "./main";

function fakeOrden(overrides: Record<string, unknown> = {}) {
  return {
    id: "orden-1",
    estado: "confirmada",
    fechaFin: new Date("2026-08-01T00:00:00Z"),
    items: [{ unidad: { modelo: { tarifaDia: 45_000, interesMoraDia: 0.05 } } }],
    payments: [],
    ...overrides,
  };
}

describe("ejecutarMoraCalculatorJob", () => {
  let prisma: { order: { findMany: jest.Mock }; payment: { create: jest.Mock } };
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = { order: { findMany: jest.fn() }, payment: { create: jest.fn() } };
  });

  afterAll(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("emite un Payment cobro_mora por cada orden vencida sin mora previa", async () => {
    prisma.order.findMany.mockResolvedValueOnce([fakeOrden()]);
    prisma.payment.create.mockResolvedValueOnce({});

    const emitidos = await ejecutarMoraCalculatorJob(prisma as unknown as PrismaClient);

    expect(emitidos).toBe(1);
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: "orden-1",
        tipo: "cobro_mora",
        metodo: "contra_entrega",
        estado: "pendiente",
      }),
    });
  });

  it("es idempotente: no emite un segundo Payment si la orden ya tiene uno de tipo cobro_mora", async () => {
    prisma.order.findMany.mockResolvedValueOnce([
      fakeOrden({ payments: [{ tipo: "cobro_mora" }] }),
    ]);

    const emitidos = await ejecutarMoraCalculatorJob(prisma as unknown as PrismaClient);

    expect(emitidos).toBe(0);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it("omite órdenes sin fecha_fin o sin items", async () => {
    prisma.order.findMany.mockResolvedValueOnce([
      fakeOrden({ fechaFin: null }),
      fakeOrden({ id: "orden-2", items: [] }),
    ]);

    const emitidos = await ejecutarMoraCalculatorJob(prisma as unknown as PrismaClient);

    expect(emitidos).toBe(0);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it("loguea un warning y omite la orden si no se puede resolver el modelo del primer item", async () => {
    prisma.order.findMany.mockResolvedValueOnce([
      fakeOrden({ items: [{ unidad: { modelo: null } }] }),
    ]);

    const emitidos = await ejecutarMoraCalculatorJob(prisma as unknown as PrismaClient);

    expect(emitidos).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("no se pudo resolver el modelo"));
  });

  it("no emite Payment si diasRetraso calculado es 0 (fecha_fin en el futuro respecto a 'ahora')", async () => {
    const fechaFinFutura = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // +1 año
    prisma.order.findMany.mockResolvedValueOnce([fakeOrden({ fechaFin: fechaFinFutura })]);

    const emitidos = await ejecutarMoraCalculatorJob(prisma as unknown as PrismaClient);

    expect(emitidos).toBe(0);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it("devuelve 0 sin llamar a payment.create cuando no hay órdenes vencidas", async () => {
    prisma.order.findMany.mockResolvedValueOnce([]);

    const emitidos = await ejecutarMoraCalculatorJob(prisma as unknown as PrismaClient);

    expect(emitidos).toBe(0);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });
});
