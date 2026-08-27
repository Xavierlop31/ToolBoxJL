import { randomUUID } from "node:crypto";
import { InMemoryVehicleRepository } from "../../fleet/infrastructure/in-memory/in-memory-vehicle.repository";
import { InMemoryShipmentRepository } from "../infrastructure/in-memory/in-memory-shipment.repository";
import { InMemoryRouteRepository } from "../infrastructure/in-memory/in-memory-route.repository";
import { VehiculoNoEncontradoError } from "../../fleet/domain/errors/vehiculo-no-encontrado.error";
import { ShipmentNoEncontradoError } from "../domain/errors/shipment-no-encontrado.error";
import { AsignarRutasUseCase } from "./asignar-rutas.use-case";

describe("AsignarRutasUseCase", () => {
  let vehiculos: InMemoryVehicleRepository;
  let shipments: InMemoryShipmentRepository;
  let rutas: InMemoryRouteRepository;
  let useCase: AsignarRutasUseCase;

  beforeEach(() => {
    vehiculos = new InMemoryVehicleRepository();
    shipments = new InMemoryShipmentRepository();
    rutas = new InMemoryRouteRepository();
    useCase = new AsignarRutasUseCase(vehiculos, shipments, rutas);
  });

  it("crea la ruta y transiciona a en_ruta_entrega los shipments tipo entrega", async () => {
    const vehiculo = await vehiculos.crear({ tipo: "moto", capacidad_kg: 50, capacidad_m3: 0.5 });
    const shipment = await shipments.crear({
      orderId: randomUUID(),
      tipo: "entrega",
      estadoEnvio: "pendiente_asignacion",
      vehiculoId: null,
    });

    const [ruta] = await useCase.ejecutar(
      [{ vehiculo_id: vehiculo.id, fecha: "2026-08-27", paradas: [shipment.id] }],
      "admin",
    );

    expect(ruta.generada_por).toBe("manual");
    expect(ruta.paradas).toEqual([shipment.id]);

    const shipmentActualizado = await shipments.buscarPorId(shipment.id);
    expect(shipmentActualizado?.estado_envio).toBe("en_ruta_entrega");
    expect(shipmentActualizado?.vehiculo_id).toBe(vehiculo.id);
  });

  it("transiciona a en_ruta_recogida los shipments tipo recogida", async () => {
    const vehiculo = await vehiculos.crear({ tipo: "moto", capacidad_kg: 50, capacidad_m3: 0.5 });
    const shipment = await shipments.crear({
      orderId: randomUUID(),
      tipo: "recogida",
      estadoEnvio: "pendiente_asignacion",
      vehiculoId: null,
    });

    await useCase.ejecutar([{ vehiculo_id: vehiculo.id, fecha: "2026-08-27", paradas: [shipment.id] }], "admin");

    const shipmentActualizado = await shipments.buscarPorId(shipment.id);
    expect(shipmentActualizado?.estado_envio).toBe("en_ruta_recogida");
  });

  it("marca generada_por = agente_1 cuando el rol solicitante es agente-1", async () => {
    const vehiculo = await vehiculos.crear({ tipo: "moto", capacidad_kg: 50, capacidad_m3: 0.5 });

    const [ruta] = await useCase.ejecutar(
      [{ vehiculo_id: vehiculo.id, fecha: "2026-08-27", paradas: [] }],
      "agente-1",
    );

    expect(ruta.generada_por).toBe("agente_1");
  });

  it("procesa múltiples inputs, devolviendo una ruta por cada uno", async () => {
    const vehiculo1 = await vehiculos.crear({ tipo: "moto", capacidad_kg: 50, capacidad_m3: 0.5 });
    const vehiculo2 = await vehiculos.crear({ tipo: "camioneta", capacidad_kg: 500, capacidad_m3: 3 });

    const resultado = await useCase.ejecutar(
      [
        { vehiculo_id: vehiculo1.id, fecha: "2026-08-27", paradas: [] },
        { vehiculo_id: vehiculo2.id, fecha: "2026-08-27", paradas: [] },
      ],
      "admin",
    );

    expect(resultado).toHaveLength(2);
  });

  it("lanza VehiculoNoEncontradoError si vehiculo_id no existe", async () => {
    await expect(
      useCase.ejecutar([{ vehiculo_id: randomUUID(), fecha: "2026-08-27", paradas: [] }], "admin"),
    ).rejects.toThrow(VehiculoNoEncontradoError);
  });

  it("lanza ShipmentNoEncontradoError si una parada no corresponde a ningún shipment, sin crear la ruta", async () => {
    const vehiculo = await vehiculos.crear({ tipo: "moto", capacidad_kg: 50, capacidad_m3: 0.5 });

    await expect(
      useCase.ejecutar(
        [{ vehiculo_id: vehiculo.id, fecha: "2026-08-27", paradas: [randomUUID()] }],
        "admin",
      ),
    ).rejects.toThrow(ShipmentNoEncontradoError);

    expect(await rutas.buscarPorVehiculoYFecha(vehiculo.id, "2026-08-27")).toBeNull();
  });
});
