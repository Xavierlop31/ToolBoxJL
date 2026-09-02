import type { EstadoEnvio, TipoEnvio } from "./shipment";

/**
 * Ruta diaria de reparto/recogida — docs/DESIGN.md §4.1, entidad `ROUTES`;
 * contrato de API: openapi.yaml `#/components/schemas/Route` (Sprint 4,
 * HU-4.1). `paradas` es un array de `shipment_id` en orden de secuencia
 * (modelado como `jsonb` en Postgres, no como relación normalizada — ver
 * docs/DESIGN.md §4.1).
 *
 * `generada_por` siempre vale `"manual"` hasta Sprint 7 (Agente 1 — Route
 * Scheduler — todavía no existe).
 */
export type GeneradaPor = "agente_1" | "manual";

export interface Route {
  id: string;
  vehiculo_id: string;
  fecha: string;
  paradas: string[];
  generada_por: GeneradaPor;
}

/** Payload de `POST /logistics/assign-routes` (uno por vehículo/día). */
export interface RouteInput {
  vehiculo_id: string;
  fecha: string;
  paradas: string[];
}

/**
 * `GET /logistics/routes-today` (Sprint 14, HU-13.4) — pestaña "Rutas del
 * Día" del panel de inventario. Ver `RutasHoyUseCase`
 * (apps/api/src/modules/logistics) para el detalle de cómo se calcula cada
 * campo, en particular `hora_estimada_llegada` (estimación naive, NO
 * telemetría real — ver openapi.yaml, descripción del endpoint) y
 * `estado_ruta`.
 */
export interface HerramientaParadaRutaHoy {
  modelo_nombre: string;
  numero_serie: string;
}

export interface ParadaRutaHoy {
  shipment_id: string;
  order_id: string;
  tipo: TipoEnvio;
  estado_envio: EstadoEnvio;
  direccion: string;
  cliente_nombre: string;
  /** Formato `"HH:mm"` — ver doc-comment de arriba sobre por qué es una estimación. */
  hora_estimada_llegada: string;
  herramientas: HerramientaParadaRutaHoy[];
}

export type EstadoRutaHoy = "Pendiente" | "En Progreso" | "Completada";

export interface RepartidorRutaHoy {
  repartidor_id: string;
  nombre: string;
  vehiculo_id: string;
  placa: string | null;
  total_paradas: number;
  paradas_completadas: number;
  /** 0-100. */
  porcentaje_avance: number;
  estado_ruta: EstadoRutaHoy;
  paradas: ParadaRutaHoy[];
}

export interface RutasHoyResponse {
  repartidores: RepartidorRutaHoy[];
}
