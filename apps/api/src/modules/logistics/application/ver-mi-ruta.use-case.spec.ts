import { randomUUID } from "node:crypto";
import { InMemoryVehicleRepository } from "../../fleet/infrastructure/in-memory/in-memory-vehicle.repository";
import { InMemoryRouteRepository } from "../infrastructure/in-memory/in-memory-route.repository";
import { InMemoryShipmentRepository } from "../infrastructure/in-memory/in-memory-shipment.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { RepartidorSinVehiculoError } from "../domain/errors/repartidor-sin-vehiculo.error";
import { RutaNoPublicadaHoyError } from "../domain/errors/ruta-no-publicada-hoy.error";
import { VerMiRutaUseCase } from "./ver-mi-ruta.use-case";

describe("VerMiRutaUseCase", () => {
  let vehiculos: InMemoryVehicleRepository;
  let rutas: InMemoryRouteRepository;
  let shipments: InMemoryShipmentRepository;
  let ordenes: InMemoryOrderRepository;
  let useCase: VerMiRutaUseCase;

  const HOY = new Date("2026-09-03T12:00:00.000Z");

  beforeEach(() => {
    vehiculos = new InMemoryVehicleRepository();
    rutas = new InMemoryRouteRepository();
    shipments = new InMemoryShipmentRepository();
    ordenes = new InMemoryOrderRepository();
    useCase = new VerMiRutaUseCase(vehiculos, rutas, shipments, ordenes);
  });

  async function crearOrden(direccion: string) {
    return ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "recogida_domicilio",
      direccionEntrega: direccion,
      zonaId: randomUUID(),
      items: [{ unidadId: randomUUID(), tarifaAplicada: 40_000 }],
    });
  }

  it("lanza RepartidorSinVehiculoError si el repartidor no tiene vehículo asignado", async () => {
    await expect(useCase.ejecutar("repartidor-sin-vehiculo", HOY)).rejects.toThrow(
      RepartidorSinVehiculoError,
    );
  });

  it("lanza RutaNoPublicadaHoyError si el vehículo no tiene ruta publicada para la fecha", async () => {
    const vehiculo = await vehiculos.crear({
      tipo: "moto",
      capacidad_kg: 20,
      capacidad_m3: 0.1,
      repartidor_id: "repartidor-1",
    });

    await expect(useCase.ejecutar("repartidor-1", HOY)).rejects.toThrow(RutaNoPublicadaHoyError);
    // La verificación de existencia del vehículo pasó (no lanza RepartidorSinVehiculoError)
    expect(vehiculo.repartidor_id).toBe("repartidor-1");
  });

  it("expande las paradas de la ruta con el detalle de shipment + dirección de la orden, en el mismo orden", async () => {
    const vehiculo = await vehiculos.crear({
      tipo: "camioneta",
      capacidad_kg: 500,
      capacidad_m3: 2,
      repartidor_id: "repartidor-1",
    });
    const ordenA = await crearOrden("Calle 1 # 2-30");
    const ordenB = await crearOrden("Carrera 5 # 10-20");
    const shipmentA = await shipments.crear({
      orderId: ordenA.id,
      vehiculoId: vehiculo.id,
      tipo: "entrega",
      estadoEnvio: "en_ruta_entrega",
    });
    const shipmentB = await shipments.crear({
      orderId: ordenB.id,
      vehiculoId: vehiculo.id,
      tipo: "entrega",
      estadoEnvio: "en_ruta_entrega",
    });
    await rutas.crear({
      vehiculoId: vehiculo.id,
      fecha: "2026-09-03",
      paradas: [shipmentB.id, shipmentA.id],
      generadaPor: "agente_1",
    });

    const resultado = await useCase.ejecutar("repartidor-1", HOY);

    expect(resultado.paradas).toHaveLength(2);
    expect(resultado.paradas[0].shipment_id).toBe(shipmentB.id);
    expect(resultado.paradas[0].direccion).toBe("Carrera 5 # 10-20");
    expect(resultado.paradas[1].shipment_id).toBe(shipmentA.id);
    expect(resultado.paradas[1].direccion).toBe("Calle 1 # 2-30");
  });

  it("omite paradas cuyo shipment ya no existe, sin romper el resto de la respuesta", async () => {
    const vehiculo = await vehiculos.crear({
      tipo: "moto",
      capacidad_kg: 20,
      capacidad_m3: 0.1,
      repartidor_id: "repartidor-1",
    });
    const orden = await crearOrden("Calle 1 # 2-30");
    const shipment = await shipments.crear({
      orderId: orden.id,
      vehiculoId: vehiculo.id,
      tipo: "entrega",
      estadoEnvio: "en_ruta_entrega",
    });
    await rutas.crear({
      vehiculoId: vehiculo.id,
      fecha: "2026-09-03",
      paradas: [randomUUID(), shipment.id],
      generadaPor: "agente_1",
    });

    const resultado = await useCase.ejecutar("repartidor-1", HOY);

    expect(resultado.paradas).toHaveLength(1);
    expect(resultado.paradas[0].shipment_id).toBe(shipment.id);
  });
});
