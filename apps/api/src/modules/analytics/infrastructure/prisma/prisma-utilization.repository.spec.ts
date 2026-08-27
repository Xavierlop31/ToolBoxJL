import { EstadoUnidad as PrismaEstadoUnidad } from "@prisma/client";
import { PrismaUtilizationRepository } from "./prisma-utilization.repository";
import type { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

describe("PrismaUtilizationRepository", () => {
  let prisma: { toolUnit: { findMany: jest.Mock }; order: { findMany: jest.Mock } };
  let repo: PrismaUtilizationRepository;
  const mes = { desde: new Date("2026-08-01T00:00:00Z"), hasta: new Date("2026-09-01T00:00:00Z") };

  beforeEach(() => {
    prisma = {
      toolUnit: { findMany: jest.fn() },
      order: { findMany: jest.fn() },
    };
    repo = new PrismaUtilizationRepository(prisma as unknown as PrismaService);
  });

  it("suma días disponibles de una unidad Operativa que ingresó antes del mes (todo el mes disponible)", async () => {
    prisma.toolUnit.findMany.mockResolvedValueOnce([
      { modeloId: "modelo-1", estado: PrismaEstadoUnidad.Operativo, fechaIngreso: new Date("2026-01-01") },
    ]);
    prisma.order.findMany.mockResolvedValueOnce([]);

    const resultado = await repo.calcularPorModelo(mes);

    expect(resultado).toEqual([{ modeloId: "modelo-1", diasAlquilada: 0, diasDisponibles: 31 }]);
  });

  it("excluye días disponibles de unidades En Mantenimiento o Dadas de Baja (pero las deja en el mapa con 0)", async () => {
    prisma.toolUnit.findMany.mockResolvedValueOnce([
      { modeloId: "modelo-1", estado: PrismaEstadoUnidad.EnMantenimiento, fechaIngreso: new Date("2026-01-01") },
      { modeloId: "modelo-2", estado: PrismaEstadoUnidad.DadoDeBaja, fechaIngreso: new Date("2026-01-01") },
    ]);
    prisma.order.findMany.mockResolvedValueOnce([]);

    const resultado = await repo.calcularPorModelo(mes);

    expect(resultado).toEqual(
      expect.arrayContaining([
        { modeloId: "modelo-1", diasAlquilada: 0, diasDisponibles: 0 },
        { modeloId: "modelo-2", diasAlquilada: 0, diasDisponibles: 0 },
      ]),
    );
  });

  it("acota días disponibles a partir de la fecha de ingreso cuando la unidad ingresó dentro del mes", async () => {
    prisma.toolUnit.findMany.mockResolvedValueOnce([
      { modeloId: "modelo-1", estado: PrismaEstadoUnidad.Nuevo, fechaIngreso: new Date("2026-08-21T00:00:00Z") },
    ]);
    prisma.order.findMany.mockResolvedValueOnce([]);

    const resultado = await repo.calcularPorModelo(mes);

    expect(resultado).toEqual([{ modeloId: "modelo-1", diasAlquilada: 0, diasDisponibles: 11 }]);
  });

  it("consulta órdenes de alquiler efectivas y suma días alquilada por modelo de sus items", async () => {
    prisma.toolUnit.findMany.mockResolvedValueOnce([]);
    prisma.order.findMany.mockResolvedValueOnce([
      {
        fechaInicio: new Date("2026-08-10T00:00:00Z"),
        fechaFin: new Date("2026-08-15T00:00:00Z"),
        items: [{ unidad: { modeloId: "modelo-1" } }],
      },
    ]);

    const resultado = await repo.calcularPorModelo(mes);

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tipo: "alquiler",
          estado: { in: ["confirmada", "en_curso", "devuelta", "cerrada"] },
        }),
      }),
    );
    expect(resultado).toEqual([{ modeloId: "modelo-1", diasAlquilada: 5, diasDisponibles: 0 }]);
  });

  it("acota días alquilada a la intersección con el mes cuando la orden empieza antes del mes", async () => {
    prisma.toolUnit.findMany.mockResolvedValueOnce([]);
    prisma.order.findMany.mockResolvedValueOnce([
      {
        fechaInicio: new Date("2026-07-28T00:00:00Z"),
        fechaFin: new Date("2026-08-05T00:00:00Z"),
        items: [{ unidad: { modeloId: "modelo-1" } }],
      },
    ]);

    const resultado = await repo.calcularPorModelo(mes);

    expect(resultado).toEqual([{ modeloId: "modelo-1", diasAlquilada: 4, diasDisponibles: 0 }]);
  });

  it("ignora órdenes sin fecha_inicio o fecha_fin (venta)", async () => {
    prisma.toolUnit.findMany.mockResolvedValueOnce([]);
    prisma.order.findMany.mockResolvedValueOnce([
      { fechaInicio: null, fechaFin: null, items: [{ unidad: { modeloId: "modelo-1" } }] },
    ]);

    const resultado = await repo.calcularPorModelo(mes);

    expect(resultado).toEqual([]);
  });
});
