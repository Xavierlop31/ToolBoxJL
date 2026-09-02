/**
 * Tipos locales que reflejan el schema `Shipment` de openapi.yaml (líneas
 * 874-883). Mismo criterio que fleet.models.ts: interfaces locales a
 * panel-admin, no shared-types (ver la nota ahí).
 */
export const ESTADOS_ENVIO = [
  'pendiente_asignacion',
  'en_ruta_entrega',
  'entregado',
  'en_ruta_recogida',
  'retornado',
] as const;

export type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];

export type TipoEnvio = 'entrega' | 'recogida';

export interface Shipment {
  id: string;
  order_id: string;
  vehiculo_id?: string | null;
  tipo: TipoEnvio;
  estado_envio: EstadoEnvio;
}

/**
 * Traducción a español legible de `estado_envio` — EXACTAMENTE los 5
 * valores que pide features/04_logistica_flota.feature (@RF-3.3):
 * "Pendiente de Asignación", "En Ruta de Entrega", "Entregado",
 * "En Ruta de Recogida" y "Retornado".
 */
export const ESTADO_ENVIO_LABEL: Record<EstadoEnvio, string> = {
  pendiente_asignacion: 'Pendiente de Asignación',
  en_ruta_entrega: 'En Ruta de Entrega',
  entregado: 'Entregado',
  en_ruta_recogida: 'En Ruta de Recogida',
  retornado: 'Retornado',
};

/**
 * Tipos de `GET /logistics/routes-today` (HU-13.4, Sprint 14, Fase 3) —
 * pestaña "Rutas del Día" del panel de Inventario QR. openapi.yaml líneas
 * 945-1003. `hora_estimada_llegada` es una estimación naive del backend, no
 * telemetría GPS en tiempo real (ver descripción del endpoint).
 */
export const ESTADOS_RUTA = ['Pendiente', 'En Progreso', 'Completada'] as const;

export type EstadoRuta = (typeof ESTADOS_RUTA)[number];

export interface HerramientaParada {
  modelo_nombre: string;
  numero_serie: string;
}

export interface ParadaRuta {
  shipment_id: string;
  order_id: string;
  tipo: TipoEnvio;
  estado_envio: EstadoEnvio;
  direccion: string;
  cliente_nombre: string;
  hora_estimada_llegada: string;
  herramientas: HerramientaParada[];
}

export interface RepartidorRuta {
  repartidor_id: string;
  nombre: string;
  vehiculo_id: string;
  placa: string | null;
  total_paradas: number;
  paradas_completadas: number;
  porcentaje_avance: number;
  estado_ruta: EstadoRuta;
  paradas: ParadaRuta[];
}

export interface RoutesToday {
  repartidores: RepartidorRuta[];
}
