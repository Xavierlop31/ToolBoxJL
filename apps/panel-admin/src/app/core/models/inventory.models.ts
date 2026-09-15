/**
 * Tipos locales que reflejan los schemas `ToolUnit`, `ToolUnitStatusLogEntry`
 * y `ToolModel` de openapi.yaml (Sprint 14, Fase 3, Épica 13 — Inventario
 * QR), más las formas de respuesta propias de `/inventory/units`,
 * `/inventory/metrics`, `/inventory/maintenance` y `/inventory/units/{id}/status`.
 *
 * Mismo criterio que `fleet.models.ts` / `logistics.models.ts` de este
 * remote y que `apps/pwa-logistica/src/app/core/models/inventory.models.ts`
 * (decisión del Tech Lead, Sprint 1): interfaces locales a panel-admin, NO
 * se tocan `packages/shared-types` (que además está desactualizado respecto
 * a este contrato — le faltan `fecha_adquisicion`/`costo_compra`/
 * `ubicacion_bodega` en `ToolUnit` y los campos de mantenimiento en
 * `ToolUnitStatusLogEntry` — para no pisar al subagente de Backend que
 * trabaja en paralelo sobre el mismo Sprint).
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
 * Estado DE VISUALIZACIÓN de `GET /inventory/units` y `estado` (filtro) de
 * ese mismo endpoint — distinto del `EstadoUnidad` persistido: "En Alquiler"
 * no es un valor del enum de `ToolUnit.estado`, es el cruce con Órdenes que
 * hace el backend (ver openapi.yaml líneas 384-389).
 */
export const ESTADOS_VISUALIZACION = [
  'Operativo',
  'En Alquiler',
  'En Mantenimiento',
  'Dado de Baja',
] as const;

export type EstadoVisualizacion = (typeof ESTADOS_VISUALIZACION)[number];

/**
 * Clase CSS de badge por estado DE VISUALIZACIÓN — compartida entre
 * `GeneralTabComponent` (tabla de "Almacén") y `UnitDetailPanelComponent`
 * (panel docked de detalle, Issue #184) para no duplicar el mapeo.
 */
export function estadoVisualizacionBadgeClass(estado: EstadoVisualizacion): string {
  switch (estado) {
    case 'Operativo':
      return 'badge-operativo';
    case 'En Alquiler':
      return 'badge-en-alquiler';
    case 'En Mantenimiento':
      return 'badge-en-mantenimiento';
    case 'Dado de Baja':
      return 'badge-dado-de-baja';
  }
}

export const TIPOS_MANTENIMIENTO = ['Preventivo', 'Correctivo'] as const;

export type TipoMantenimiento = (typeof TIPOS_MANTENIMIENTO)[number];

export interface ToolUnit {
  id: string;
  modelo_id: string;
  numero_serie: string;
  estado: EstadoUnidad;
  fecha_ingreso: string;
  qr_code_url: string;
  fecha_adquisicion?: string | null;
  costo_compra?: number | null;
  ubicacion_bodega?: string | null;
}

/** Fila de `GET /inventory/units` (HU-13.1) — `ToolUnit` expandido. */
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

/** `GET /inventory/metrics` (HU-13.1) — las 4 tarjetas de KPIs. */
export interface InventoryMetrics {
  total_unidades: number;
  operativas: number;
  en_alquiler: number;
  en_mantenimiento_o_baja: number;
}

/**
 * Entrada de la hoja de vida de una unidad — `ToolUnitStatusLogEntry`,
 * incluidos los campos de taller nuevos de Sprint 14 (HU-13.3), todos
 * opcionales en el backend (null si no aplican).
 */
export interface ToolUnitStatusLogEntry {
  id: string;
  unidad_id: string;
  estado_anterior: EstadoUnidad | null;
  estado_nuevo: EstadoUnidad;
  fotos_urls: string[];
  autor_id: string;
  created_at: string;
  tipo_mantenimiento?: TipoMantenimiento | null;
  falla_reportada?: string | null;
  tecnico_asignado?: string | null;
  costo_estimado?: number | null;
  fecha_prevista_fin?: string | null;
  motivo_baja?: string | null;
}

/** Fila de `GET /inventory/maintenance` (HU-13.3). */
export interface MaintenanceUnit extends ToolUnit {
  modelo_nombre: string;
  ultimo_evento_mantenimiento: ToolUnitStatusLogEntry | null;
}

/** Payload de `POST /inventory/units` (HU-13.2). */
export interface CreateToolUnitInput {
  modelo_id: string;
  numero_serie: string;
  fecha_adquisicion: string;
  costo_compra: number;
  ubicacion_bodega: string;
}

/**
 * Payload de `PATCH /inventory/units/{id}/status` (HU-13.3). El backend
 * solo exige `estado_nuevo` — es la UI del panel admin la que exige el resto
 * de los campos como obligatorios según el `estado_nuevo` elegido (ver
 * StatusChangeModalComponent).
 */
export interface UpdateToolUnitStatusInput {
  estado_nuevo: EstadoUnidad;
  fotos_urls?: string[];
  tipo_mantenimiento?: TipoMantenimiento;
  falla_reportada?: string;
  tecnico_asignado?: string;
  costo_estimado?: number;
  fecha_prevista_fin?: string;
  motivo_baja?: string;
}

/**
 * Subconjunto de `ToolModel` (openapi.yaml) usado por el selector de
 * "Modelo de Herramienta" del formulario de alta de unidad (HU-13.2) —
 * poblado desde `GET /catalog/search`.
 */
export interface ToolModelOption {
  id: string;
  nombre: string;
  marca: string;
  categoria: string;
}
