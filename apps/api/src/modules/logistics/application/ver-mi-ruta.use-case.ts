import { Inject, Injectable } from "@nestjs/common";
import type { EstadoEnvio, Route, TipoEnvio } from "@toolboxjl/shared-types";
import { VEHICLE_REPOSITORY } from "../../fleet/infrastructure/fleet.tokens";
import type { VehicleRepository } from "../../fleet/domain/vehicle.repository";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";
import { SHIPMENT_REPOSITORY, ROUTE_REPOSITORY } from "../infrastructure/logistics.tokens";
import type { ShipmentRepository } from "../domain/shipment.repository";
import type { RouteRepository } from "../domain/route.repository";
import { RepartidorSinVehiculoError } from "../domain/errors/repartidor-sin-vehiculo.error";
import { RutaNoPublicadaHoyError } from "../domain/errors/ruta-no-publicada-hoy.error";

/** Una parada de `Route.paradas` ya expandida — forma exacta que pide openapi.yaml para `GET /logistics/my-route`. */
export interface ParadaRuta {
  shipment_id: string;
  order_id: string;
  tipo: TipoEnvio;
  estado_envio: EstadoEnvio;
  direccion: string;
}

export interface RutaRepartidor {
  route: Route;
  paradas: ParadaRuta[];
}

function fechaDeHoy(ahora: Date): string {
  return ahora.toISOString().slice(0, 10);
}

/**
 * `GET /logistics/my-route` (HU-8.2, Sprint 7). Flujo (decisión del Tech
 * Lead):
 * 1. Resuelve el `Vehicle` del Repartidor autenticado por `repartidor_id`.
 *    Si no tiene ninguno → `RepartidorSinVehiculoError` (404 en el
 *    controller).
 * 2. Busca la `Route` de HOY para ese `vehiculo_id`. Si no hay ninguna
 *    publicada → `RutaNoPublicadaHoyError` (404).
 * 3. Expande `Route.paradas` (array de `shipment_id`, ya en el orden de
 *    secuencia que decidió el Agente 1 o quien haya publicado la ruta) al
 *    detalle que pide el contrato: por cada parada, el `Shipment` completo
 *    más la `direccion_entrega` de su `Order` asociada. Mantiene el mismo
 *    orden — no se reordena ni se agrupa.
 *
 * `ahora` es parámetro opcional (mismo criterio que
 * `EjecutarMoraCalculatorUseCase.ejecutar`) para que los tests/BDD puedan
 * fijar "hoy" sin depender del reloj real del proceso; el controller de
 * producción siempre lo deja en su default (`new Date()`).
 */
@Injectable()
export class VerMiRutaUseCase {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehiculos: VehicleRepository,
    @Inject(ROUTE_REPOSITORY)
    private readonly rutas: RouteRepository,
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipments: ShipmentRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
  ) {}

  async ejecutar(repartidorId: string, ahora: Date = new Date()): Promise<RutaRepartidor> {
    const vehiculo = await this.vehiculos.buscarPorRepartidorId(repartidorId);
    if (!vehiculo) {
      throw new RepartidorSinVehiculoError(repartidorId);
    }

    const fecha = fechaDeHoy(ahora);
    const route = await this.rutas.buscarPorVehiculoYFecha(vehiculo.id, fecha);
    if (!route) {
      throw new RutaNoPublicadaHoyError(vehiculo.id, fecha);
    }

    const paradas: ParadaRuta[] = [];
    for (const shipmentId of route.paradas) {
      const shipment = await this.shipments.buscarPorId(shipmentId);
      if (!shipment) {
        // Consistencia de datos ya validada al publicar la ruta
        // (AsignarRutasUseCase no crea una Route con paradas que no
        // resuelven a un Shipment real) — si esto pasa, es un dato
        // corrupto/borrado después de publicar, no un caso de negocio
        // esperado. Se omite la parada en vez de romper toda la respuesta.
        continue;
      }
      const orden = await this.ordenes.buscarPorId(shipment.order_id);
      paradas.push({
        shipment_id: shipment.id,
        order_id: shipment.order_id,
        tipo: shipment.tipo,
        estado_envio: shipment.estado_envio,
        direccion: orden?.direccion_entrega ?? "",
      });
    }

    return { route, paradas };
  }
}
