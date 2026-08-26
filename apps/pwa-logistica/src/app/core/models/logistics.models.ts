/**
 * Tipos locales que reflejan la respuesta de `GET /logistics/my-route`
 * (HU-8.2, openapi.yaml líneas 549-589). Mismo criterio que
 * `inventory.models.ts`/`inspection.models.ts`: interfaces locales a
 * pwa-logistica, no shared-types.
 *
 * `EstadoEnvio`/`ESTADO_ENVIO_LABEL` son el mismo enum de 5 valores que
 * `apps/panel-admin/src/app/core/models/logistics.models.ts` (RF-3.3) —
 * duplicado a propósito acá (interfaces locales por app, no shared-types
 * todavía) y NO editado en panel-admin, que es alcance de otro sprint.
 */
export const ESTADOS_ENVIO = [
  'pendiente_asignacion',
  'en_ruta_entrega',
  'entregado',
  'en_ruta_recogida',
  'retornado',
] as const;

export type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];

export type TipoParada = 'entrega' | 'recogida';

export const ESTADO_ENVIO_LABEL: Record<EstadoEnvio, string> = {
  pendiente_asignacion: 'Pendiente de Asignación',
  en_ruta_entrega: 'En Ruta de Entrega',
  entregado: 'Entregado',
  en_ruta_recogida: 'En Ruta de Recogida',
  retornado: 'Retornado',
};

export const TIPO_PARADA_LABEL: Record<TipoParada, string> = {
  entrega: 'Entrega',
  recogida: 'Recogida',
};

/** Schema `Route` de openapi.yaml (líneas 1015-1024). */
export interface Route {
  id: string;
  vehiculo_id: string;
  fecha: string;
  paradas: string[];
  generada_por: 'agente_1' | 'manual';
}

/**
 * Un ítem de `paradas` en la respuesta de `GET /logistics/my-route` — ya
 * viene expandido con el detalle de cada parada (no es solo el
 * `shipment_id` de `Route.paradas`).
 */
export interface ParadaRuta {
  shipment_id: string;
  order_id: string;
  tipo: TipoParada;
  estado_envio: EstadoEnvio;
  direccion: string;
}

export interface MyRouteResponse {
  route: Route;
  paradas: ParadaRuta[];
}
