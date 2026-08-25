import { Inject, Injectable } from "@nestjs/common";
import type { EstadoEnvio, Route, RouteInput } from "@toolboxjl/shared-types";
import { VEHICLE_REPOSITORY } from "../../fleet/infrastructure/fleet.tokens";
import type { VehicleRepository } from "../../fleet/domain/vehicle.repository";
import { VehiculoNoEncontradoError } from "../../fleet/domain/errors/vehiculo-no-encontrado.error";
import { SHIPMENT_REPOSITORY, ROUTE_REPOSITORY } from "../infrastructure/logistics.tokens";
import type { ShipmentRepository } from "../domain/shipment.repository";
import type { RouteRepository } from "../domain/route.repository";
import { ShipmentNoEncontradoError } from "../domain/errors/shipment-no-encontrado.error";

/**
 * `POST /logistics/assign-routes` (RF-3.1). Publica las rutas del día:
 * decisiones del Tech Lead (Sprint 4) —
 * 1. Valida que `vehiculo_id` exista (si no, `VehiculoNoEncontradoError` →
 *    400 en el controller).
 * 2. Crea el `Route`.
 * 3. Para cada `shipment_id` en `paradas`, asigna el vehículo de la ruta y
 *    transiciona `estado_envio`: `pendiente_asignacion` → `en_ruta_entrega`
 *    si el Shipment es `tipo: "entrega"`, o `en_ruta_recogida` si es
 *    `tipo: "recogida"`.
 * `generada_por` siempre `"manual"` en este sprint — el Agente 1 (Sprint 7)
 * todavía no existe.
 */
@Injectable()
export class AsignarRutasUseCase {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehiculos: VehicleRepository,
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipments: ShipmentRepository,
    @Inject(ROUTE_REPOSITORY)
    private readonly rutas: RouteRepository,
  ) {}

  async ejecutar(inputs: RouteInput[]): Promise<Route[]> {
    const rutasCreadas: Route[] = [];

    for (const input of inputs) {
      const vehiculo = await this.vehiculos.buscarPorId(input.vehiculo_id);
      if (!vehiculo) {
        throw new VehiculoNoEncontradoError(input.vehiculo_id);
      }

      // Validar las paradas ANTES de crear la ruta, para no dejar una Route
      // "huérfana" creada si una parada resulta inválida.
      const shipmentsDeLaRuta = [];
      for (const shipmentId of input.paradas) {
        const shipment = await this.shipments.buscarPorId(shipmentId);
        if (!shipment) {
          throw new ShipmentNoEncontradoError(shipmentId);
        }
        shipmentsDeLaRuta.push(shipment);
      }

      const ruta = await this.rutas.crear({
        vehiculoId: input.vehiculo_id,
        fecha: input.fecha,
        paradas: input.paradas,
        generadaPor: "manual",
      });

      for (const shipment of shipmentsDeLaRuta) {
        const nuevoEstado: EstadoEnvio =
          shipment.tipo === "entrega" ? "en_ruta_entrega" : "en_ruta_recogida";
        await this.shipments.asignarVehiculoYEstado(shipment.id, input.vehiculo_id, nuevoEstado);
      }

      rutasCreadas.push(ruta);
    }

    return rutasCreadas;
  }
}
