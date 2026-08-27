import { PrismaDeliveryProductivityRepository } from "./prisma-delivery-productivity.repository";
import type { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

describe("PrismaDeliveryProductivityRepository", () => {
  let prisma: {
    vehicle: { findMany: jest.Mock };
    route: { findMany: jest.Mock };
    shipment: { findMany: jest.Mock };
  };
  let repo: PrismaDeliveryProductivityRepository;
  const mes = { desde: new Date("2026-08-01T00:00:00Z"), hasta: new Date("2026-09-01T00:00:00Z") };

  beforeEach(() => {
    prisma = {
      vehicle: { findMany: jest.fn() },
      route: { findMany: jest.fn() },
      shipment: { findMany: jest.fn() },
    };
    repo = new PrismaDeliveryProductivityRepository(prisma as unknown as PrismaService);
  });

  it("devuelve [] sin consultar rutas si ningún vehículo tiene repartidor asignado", async () => {
    prisma.vehicle.findMany.mockResolvedValueOnce([]);

    const resultado = await repo.listarPorRepartidor(mes);

    expect(resultado).toEqual([]);
    expect(prisma.route.findMany).not.toHaveBeenCalled();
  });

  it("devuelve [] sin consultar shipments si las rutas del mes no tienen paradas", async () => {
    prisma.vehicle.findMany.mockResolvedValueOnce([{ id: "vehiculo-1", repartidorId: "repartidor-1" }]);
    prisma.route.findMany.mockResolvedValueOnce([{ vehiculoId: "vehiculo-1", paradas: [] }]);

    const resultado = await repo.listarPorRepartidor(mes);

    expect(resultado).toEqual([]);
    expect(prisma.shipment.findMany).not.toHaveBeenCalled();
  });

  it("cuenta entregas exitosas (entrega+entregado, recogida+retornado) y ruta asignada total por repartidor", async () => {
    prisma.vehicle.findMany.mockResolvedValueOnce([
      { id: "vehiculo-1", repartidorId: "repartidor-1" },
      { id: "vehiculo-2", repartidorId: "repartidor-2" },
    ]);
    prisma.route.findMany.mockResolvedValueOnce([
      { vehiculoId: "vehiculo-1", paradas: ["shipment-1", "shipment-2", "shipment-3"] },
      { vehiculoId: "vehiculo-2", paradas: ["shipment-4"] },
    ]);
    prisma.shipment.findMany.mockResolvedValueOnce([
      { id: "shipment-1", tipo: "entrega", estadoEnvio: "entregado" },
      { id: "shipment-2", tipo: "entrega", estadoEnvio: "en_ruta" },
      { id: "shipment-3", tipo: "recogida", estadoEnvio: "retornado" },
      { id: "shipment-4", tipo: "recogida", estadoEnvio: "en_ruta" },
    ]);

    const resultado = await repo.listarPorRepartidor(mes);

    expect(resultado).toEqual(
      expect.arrayContaining([
        { repartidorId: "repartidor-1", entregasExitosas: 2, rutaAsignada: 3 },
        { repartidorId: "repartidor-2", entregasExitosas: 0, rutaAsignada: 1 },
      ]),
    );
  });

  it("omite paradas cuyo shipment ya no existe (dato corrupto/borrado), sin romper el resto", async () => {
    prisma.vehicle.findMany.mockResolvedValueOnce([{ id: "vehiculo-1", repartidorId: "repartidor-1" }]);
    prisma.route.findMany.mockResolvedValueOnce([
      { vehiculoId: "vehiculo-1", paradas: ["shipment-fantasma", "shipment-1"] },
    ]);
    prisma.shipment.findMany.mockResolvedValueOnce([
      { id: "shipment-1", tipo: "entrega", estadoEnvio: "entregado" },
    ]);

    const resultado = await repo.listarPorRepartidor(mes);

    expect(resultado).toEqual([{ repartidorId: "repartidor-1", entregasExitosas: 1, rutaAsignada: 1 }]);
  });

  it("omite paradas cuyo vehículo ya no tiene repartidor mapeado", async () => {
    prisma.vehicle.findMany.mockResolvedValueOnce([{ id: "vehiculo-1", repartidorId: "repartidor-1" }]);
    // La ruta referencia un vehículo distinto al que devolvió vehicle.findMany
    // (ej. se le quitó el repartidor entre que se publicó la ruta y se consultó).
    prisma.route.findMany.mockResolvedValueOnce([{ vehiculoId: "vehiculo-2", paradas: ["shipment-1"] }]);
    prisma.shipment.findMany.mockResolvedValueOnce([
      { id: "shipment-1", tipo: "entrega", estadoEnvio: "entregado" },
    ]);

    const resultado = await repo.listarPorRepartidor(mes);

    expect(resultado).toEqual([]);
  });
});
