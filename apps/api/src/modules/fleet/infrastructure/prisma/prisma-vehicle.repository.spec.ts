import type { Vehicle as PrismaVehicle } from "@prisma/client";
import { PrismaVehicleRepository } from "./prisma-vehicle.repository";
import type { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

function fakeVehicle(overrides: Partial<PrismaVehicle> = {}): PrismaVehicle {
  return {
    id: "vehiculo-1",
    tipo: "moto",
    capacidadKg: 50,
    capacidadM3: 0.5,
    zonas: ["zona-1"],
    repartidorId: null,
    ...overrides,
  } as PrismaVehicle;
}

describe("PrismaVehicleRepository", () => {
  let prisma: { vehicle: Record<string, jest.Mock> };
  let repo: PrismaVehicleRepository;

  beforeEach(() => {
    prisma = {
      vehicle: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    repo = new PrismaVehicleRepository(prisma as unknown as PrismaService);
  });

  it("crear() mapea el input al schema de Prisma, con zonas [] por default y devuelve el dominio", async () => {
    prisma.vehicle.create.mockResolvedValueOnce(fakeVehicle());

    const resultado = await repo.crear({ tipo: "moto", capacidad_kg: 50, capacidad_m3: 0.5 });

    expect(prisma.vehicle.create).toHaveBeenCalledWith({
      data: {
        tipo: "moto",
        capacidadKg: 50,
        capacidadM3: 0.5,
        zonas: [],
        repartidorId: undefined,
      },
    });
    expect(resultado.id).toBe("vehiculo-1");
    expect(resultado.capacidad_kg).toBe(50);
  });

  it("crear() propaga zonas y repartidor_id cuando se proveen", async () => {
    prisma.vehicle.create.mockResolvedValueOnce(
      fakeVehicle({ zonas: ["z1", "z2"], repartidorId: "repartidor-1" }),
    );

    await repo.crear({
      tipo: "camioneta",
      capacidad_kg: 500,
      capacidad_m3: 3,
      zonas: ["z1", "z2"],
      repartidor_id: "repartidor-1",
    });

    expect(prisma.vehicle.create).toHaveBeenCalledWith({
      data: {
        tipo: "camioneta",
        capacidadKg: 500,
        capacidadM3: 3,
        zonas: ["z1", "z2"],
        repartidorId: "repartidor-1",
      },
    });
  });

  it("buscarPorId() devuelve null si no existe", async () => {
    prisma.vehicle.findUnique.mockResolvedValueOnce(null);

    expect(await repo.buscarPorId("no-existe")).toBeNull();
  });

  it("buscarPorId() devuelve el vehículo mapeado si existe", async () => {
    prisma.vehicle.findUnique.mockResolvedValueOnce(fakeVehicle());

    const resultado = await repo.buscarPorId("vehiculo-1");

    expect(prisma.vehicle.findUnique).toHaveBeenCalledWith({ where: { id: "vehiculo-1" } });
    expect(resultado?.tipo).toBe("moto");
  });

  it("buscarPorRepartidorId() devuelve null si el repartidor no tiene vehículo asignado", async () => {
    prisma.vehicle.findFirst.mockResolvedValueOnce(null);

    expect(await repo.buscarPorRepartidorId("repartidor-sin-vehiculo")).toBeNull();
  });

  it("buscarPorRepartidorId() devuelve el vehículo mapeado cuando encuentra uno", async () => {
    prisma.vehicle.findFirst.mockResolvedValueOnce(fakeVehicle({ repartidorId: "repartidor-1" }));

    const resultado = await repo.buscarPorRepartidorId("repartidor-1");

    expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({ where: { repartidorId: "repartidor-1" } });
    expect(resultado?.repartidor_id).toBe("repartidor-1");
  });
});
