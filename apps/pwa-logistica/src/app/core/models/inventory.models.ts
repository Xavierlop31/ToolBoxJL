/**
 * Tipos locales que reflejan los schemas `ToolUnit` y
 * `ToolUnitStatusLogEntry` de openapi.yaml (líneas 740-767), extendidos en
 * Sprint 14 (Fase 3, Épica 13, Issues #147/#148) con el alta de unidad
 * (HU-13.2) y los campos de mantenimiento/baja (HU-13.3) — mismos campos que
 * `apps/panel-admin/src/app/core/models/inventory.models.ts`.
 *
 * Decisión del Tech Lead (Sprint 1, ratificada en Sprint 14): NO se toca
 * packages/shared-types — Backend agrega ahí sus propios tipos en paralelo.
 * Interfaces locales a pwa-logistica; se podrán migrar a shared-types más
 * adelante.
 */
export const ESTADOS_UNIDAD = [
  'Nuevo',
  'Excelente',
  'Operativo',
  'En Mantenimiento',
  'Dado de Baja',
] as const;

export type EstadoUnidad = (typeof ESTADOS_UNIDAD)[number];

/**
 * Estado DE VISUALIZACIÓN de `GET /inventory/units` — distinto del
 * `EstadoUnidad` persistido: "En Alquiler" no es un valor del enum de
 * `ToolUnit.estado`, es el cruce con Órdenes que hace el backend (ver
 * openapi.yaml líneas 384-389).
 */
export const ESTADOS_VISUALIZACION = [
  'Operativo',
  'En Alquiler',
  'En Mantenimiento',
  'Dado de Baja',
] as const;

export type EstadoVisualizacion = (typeof ESTADOS_VISUALIZACION)[number];

export const TIPOS_MANTENIMIENTO = ['Preventivo', 'Correctivo'] as const;

export type TipoMantenimiento = (typeof TIPOS_MANTENIMIENTO)[number];

export interface ToolUnit {
  id: string;
  modelo_id: string;
  numero_serie: string;
  estado: EstadoUnidad;
  fecha_ingreso?: string;
  qr_code_url?: string;
  fecha_adquisicion?: string;
  costo_compra?: number;
  ubicacion_bodega?: string;
}

export interface ToolUnitStatusLogEntry {
  id: string;
  unidad_id: string;
  estado_anterior: EstadoUnidad;
  estado_nuevo: EstadoUnidad;
  fotos_urls?: string[];
  autor_id: string;
  created_at: string;
  tipo_mantenimiento?: TipoMantenimiento;
  falla_reportada?: string;
  tecnico_asignado?: string;
  costo_estimado?: number;
  fecha_prevista_fin?: string;
  motivo_baja?: string;
}

/**
 * Payload de `PATCH /inventory/units/{id}/status` (HU-13.3). El backend
 * solo exige `estado_nuevo` — es la UI (`UnitDetailComponent`) la que exige
 * el resto de los campos como obligatorios según el `estado_nuevo` elegido.
 */
export interface UpdateUnitStatusInput {
  estado_nuevo: EstadoUnidad;
  fotos_urls?: string[];
  tipo_mantenimiento?: TipoMantenimiento;
  falla_reportada?: string;
  tecnico_asignado?: string;
  costo_estimado?: number;
  fecha_prevista_fin?: string;
  motivo_baja?: string;
}

/** Payload de `POST /inventory/units` (HU-13.2) — alta de unidad + QR. */
export interface CreateUnitInput {
  modelo_id: string;
  numero_serie: string;
  fecha_adquisicion: string;
  costo_compra: number;
  ubicacion_bodega: string;
}

/** Alias del payload de alta — mismo nombre que usa el contrato (`ToolUnitInput`). */
export type ToolUnitInput = CreateUnitInput;

/** Fila de `GET /inventory/units` (HU-13.1 reducido) — `ToolUnit` expandido. */
export interface ToolUnitListItem extends ToolUnit {
  modelo_nombre: string;
  modelo_categoria: string;
  estado_visualizacion: EstadoVisualizacion;
}

export interface ListToolUnitsResult {
  items: ToolUnitListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListToolUnitsParams {
  q?: string;
  estado?: EstadoVisualizacion;
  page?: number;
  pageSize?: number;
}

/**
 * Subconjunto de `ToolModel` (openapi.yaml) usado por el selector de
 * "Modelo" del formulario de alta de unidad (HU-13.2) — poblado desde
 * `GET /catalog/search` (público).
 */
export interface ToolModelOption {
  id: string;
  nombre: string;
  marca: string;
  categoria: string;
}
