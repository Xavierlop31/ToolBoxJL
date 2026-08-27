import type { Shipment as PrismaShipment } from "@prisma/client";
import { PrismaShipmentRepository } from "./prisma-shipment.repository";
import type { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

function fakeShipment(overrides: Partial<PrismaShipment> = {}): PrismaShipment {
  return {
    id: "shipment-1",
    orderId: "orden-1",
    vehiculoId: null,
    tipo: "entrega",
    estadoEnvio: "pendiente_asignacion",
    ...overrides,
  } as PrismaShipment;
}

describe("PrismaShipmentRepository", () => {
  let prisma: { shipment: Record<string, jest.Mock> };
  let repo: PrismaShipmentRepository;

  beforeEach(() => {
    prisma = {
      shipment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    repo = new PrismaShipmentRepository(prisma as unknown as PrismaService);
  });

  it("crear() mapea el input y devuelve el dominio", async () => {
    prisma.shipment.create.mockResolvedValueOnce(fakeShipment());

    const resultado = await repo.crear({
      orderId: "orden-1",
      tipo: "entrega",
      estadoEnvio: "pendiente_asignacion",
      vehiculoId: null,
    });

    expect(prisma.shipment.create).toHaveBeenCalledWith({
      data: { orderId: "orden-1", tipo: "entrega", estadoEnvio: "pendiente_asignacion", vehiculoId: undefined },
    });
    expect(resultado.id).toBe("shipment-1");
    expect(resultado.order_id).toBe("orden-1");
  });

  it("buscarPorId() devuelve null si Prisma no encuentra el shipment", async () => {
    prisma.shipment.findUnique.mockResolvedValueOnce(null);

    expect(await repo.buscarPorId("no-existe")).toBeNull();
  });

  it("buscarPorId() devuelve el shipment mapeado si existe", async () => {
    prisma.shipment.findUnique.mockResolvedValueOnce(fakeShipment());

    const resultado = await repo.buscarPorId("shipment-1");

    expect(resultado?.estado_envio).toBe("pendiente_asignacion");
  });

  it("listarPendientesDeAsignacion() filtra por estado pendiente_asignacion", async () => {
    prisma.shipment.findMany.mockResolvedValueOnce([fakeShipment()]);

    const resultado = await repo.listarPendientesDeAsignacion();

    expect(prisma.shipment.findMany).toHaveBeenCalledWith({
      where: { estadoEnvio: "pendiente_asignacion" },
    });
    expect(resultado).toHaveLength(1);
  });

  it("listarTodos() no aplica filtros", async () => {
    prisma.shipment.findMany.mockResolvedValueOnce([fakeShipment(), fakeShipment({ id: "shipment-2" })]);

    const resultado = await repo.listarTodos();

    expect(prisma.shipment.findMany).toHaveBeenCalledWith();
    expect(resultado).toHaveLength(2);
  });

  it("asignarVehiculoYEstado() actualiza vehiculo_id y estado_envio", async () => {
    prisma.shipment.update.mockResolvedValueOnce(
      fakeShipment({ vehiculoId: "vehiculo-1", estadoEnvio: "en_ruta_entrega" }),
    );

    const resultado = await repo.asignarVehiculoYEstado("shipment-1", "vehiculo-1", "en_ruta_entrega");

    expect(prisma.shipment.update).toHaveBeenCalledWith({
      where: { id: "shipment-1" },
      data: { vehiculoId: "vehiculo-1", estadoEnvio: "en_ruta_entrega" },
    });
    expect(resultado.vehiculo_id).toBe("vehiculo-1");
    expect(resultado.estado_envio).toBe("en_ruta_entrega");
  });

  it("actualizarEstadoEnvio() actualiza solo el estado_envio", async () => {
    prisma.shipment.update.mockResolvedValueOnce(fakeShipment({ estadoEnvio: "entregado" }));

    const resultado = await repo.actualizarEstadoEnvio("shipment-1", "entregado");

    expect(prisma.shipment.update).toHaveBeenCalledWith({
      where: { id: "shipment-1" },
      data: { estadoEnvio: "entregado" },
    });
    expect(resultado.estado_envio).toBe("entregado");
  });
});
