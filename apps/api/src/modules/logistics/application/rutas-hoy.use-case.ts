import { Inject, Injectable } from "@nestjs/common";
import type {
  EstadoRutaHoy,
  HerramientaParadaRutaHoy,
  ParadaRutaHoy,
  RepartidorRutaHoy,
  RutasHoyResponse,
} from "@toolboxjl/shared-types";
import { VEHICLE_REPOSITORY } from "../../fleet/infrastructure/fleet.tokens";
import type { VehicleRepository } from "../../fleet/domain/vehicle.repository";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";
import {
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
} from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../../catalog-inventory/domain/tool-unit.repository";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import { USER_REPOSITORY } from "../../users/infrastructure/users.tokens";
import type { UserRepository } from "../../users/domain/user.repository";
import { SHIPMENT_REPOSITORY, ROUTE_REPOSITORY } from "../infrastructure/logistics.tokens";
import type { ShipmentRepository } from "../domain/shipment.repository";
import type { RouteRepository } from "../domain/route.repository";

const ESTADOS_TERMINALES_EXITOSOS = new Set(["entregado", "retornado"]);

const MINUTOS_ENTRE_PARADAS = 45;
const HORA_INICIO_JORNADA_MIN = 8 * 60; // "08:00"

function formatearHora(minutosDesdeMedianoche: number): string {
  const horas = Math.floor(minutosDesdeMedianoche / 60) % 24;
  const minutos = minutosDesdeMedianoche % 60;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function fechaDeHoy(ahora: Date): string {
  return ahora.toISOString().slice(0, 10);
}

/**
 * `GET /logistics/routes-today` (HU-13.4, Sprint 14) — pestaña "Rutas del
 * Día" del panel de inventario. Agrupa las `Route` de hoy por repartidor
 * (`Vehicle.repartidor_id`), expandidas con nombre/vehículo/placa y el
 * detalle de cada parada.
 *
 * Flujo, por cada `Route` de la fecha:
 * 1. Resuelve el `Vehicle` (`Route.vehiculo_id`). Si no existe o no tiene
 *    `repartidor_id` asignado, se OMITE esa ruta — no hay a quién
 *    agruparla (dato corrupto/vehículo sin repartidor, no un caso de
 *    negocio esperado, mismo criterio que `VerMiRutaUseCase` con paradas
 *    huérfanas).
 * 2. Resuelve el nombre del repartidor vía `UserRepository` (Sprint 14 —
 *    primer caso de uso que lee `public.users` desde Node, ver
 *    `users/domain/user.repository.ts`).
 * 3. Expande cada `shipment_id` de `Route.paradas` (mismo patrón que
 *    `VerMiRutaUseCase`: si el `Shipment` no resuelve, se omite esa parada)
 *    con la `Order`/`User`/`ToolUnit`/`ToolModel` asociados.
 *
 * `hora_estimada_llegada` = `"08:00" + 45min × posición en la secuencia de
 * `Route.paradas`` — estimación naive documentada en openapi.yaml, NO
 * telemetría real (no hay tracking de vehículos en este sprint).
 *
 * No deduplica por `repartidor_id`: si (caso borde, no impedido por
 * `VehicleRepository`) un mismo repartidor tuviera 2 vehículos con `Route`
 * publicada hoy, aparecería 2 veces en `repartidores` — más simple y más
 * correcto que fusionar itinerarios de 2 vehículos distintos bajo una sola
 * entrada.
 */
@Injectable()
export class RutasHoyUseCase {
  constructor(
    @Inject(ROUTE_REPOSITORY)
    private readonly rutas: RouteRepository,
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehiculos: VehicleRepository,
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipments: ShipmentRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly modelos: ToolModelRepository,
    @Inject(USER_REPOSITORY)
    private readonly usuarios: UserRepository,
  ) {}

  async ejecutar(ahora: Date = new Date()): Promise<RutasHoyResponse> {
    const fecha = fechaDeHoy(ahora);
    const rutasDeHoy = await this.rutas.listarPorFecha(fecha);

    const repartidores: RepartidorRutaHoy[] = [];

    for (const route of rutasDeHoy) {
      const vehiculo = await this.vehiculos.buscarPorId(route.vehiculo_id);
      if (!vehiculo || !vehiculo.repartidor_id) {
        continue;
      }

      const usuarioRepartidor = await this.usuarios.buscarPorId(vehiculo.repartidor_id);

      const paradas: ParadaRutaHoy[] = [];
      for (const [indice, shipmentId] of route.paradas.entries()) {
        const shipment = await this.shipments.buscarPorId(shipmentId);
        if (!shipment) {
          continue;
        }
        const orden = await this.ordenes.buscarPorId(shipment.order_id);
        const usuarioCliente = orden
          ? await this.usuarios.buscarPorId(orden.cliente_id)
          : null;

        const herramientas: HerramientaParadaRutaHoy[] = [];
        for (const item of orden?.items ?? []) {
          const unidad = await this.unidades.buscarPorId(item.unidad_id);
          const modelo = unidad ? await this.modelos.buscarPorId(unidad.modelo_id) : null;
          herramientas.push({
            modelo_nombre: modelo?.nombre ?? "",
            numero_serie: unidad?.numero_serie ?? "",
          });
        }

        paradas.push({
          shipment_id: shipment.id,
          order_id: shipment.order_id,
          tipo: shipment.tipo,
          estado_envio: shipment.estado_envio,
          direccion: orden?.direccion_entrega ?? "",
          cliente_nombre: usuarioCliente?.nombre ?? "",
          hora_estimada_llegada: formatearHora(
            HORA_INICIO_JORNADA_MIN + MINUTOS_ENTRE_PARADAS * indice,
          ),
          herramientas,
        });
      }

      const totalParadas = paradas.length;
      const paradasCompletadas = paradas.filter((p) =>
        ESTADOS_TERMINALES_EXITOSOS.has(p.estado_envio),
      ).length;
      const porcentajeAvance =
        totalParadas === 0 ? 0 : Math.round((paradasCompletadas / totalParadas) * 100);

      let estadoRuta: EstadoRutaHoy;
      if (paradasCompletadas === 0) {
        estadoRuta = "Pendiente";
      } else if (paradasCompletadas === totalParadas) {
        estadoRuta = "Completada";
      } else {
        estadoRuta = "En Progreso";
      }

      repartidores.push({
        repartidor_id: vehiculo.repartidor_id,
        nombre: usuarioRepartidor?.nombre ?? "",
        vehiculo_id: vehiculo.id,
        placa: vehiculo.placa,
        total_paradas: totalParadas,
        paradas_completadas: paradasCompletadas,
        porcentaje_avance: porcentajeAvance,
        estado_ruta: estadoRuta,
        paradas,
      });
    }

    return { repartidores };
  }
}
