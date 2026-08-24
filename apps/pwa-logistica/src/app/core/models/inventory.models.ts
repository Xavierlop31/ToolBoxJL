/**
 * Tipos locales que reflejan los schemas `ToolUnit` y
 * `ToolUnitStatusLogEntry` de openapi.yaml (líneas 740-767).
 *
 * Decisión del Tech Lead (Sprint 1): NO se toca packages/shared-types este
 * sprint — Backend agrega ahí sus propios tipos en paralelo. Interfaces
 * locales a pwa-logistica; se podrán migrar a shared-types más adelante.
 */
export const ESTADOS_UNIDAD = [
  'Nuevo',
  'Excelente',
  'Operativo',
  'En Mantenimiento',
  'Dado de Baja',
] as const;

export type EstadoUnidad = (typeof ESTADOS_UNIDAD)[number];

export interface ToolUnit {
  id: string;
  modelo_id: string;
  numero_serie: string;
  estado: EstadoUnidad;
  fecha_ingreso?: string;
  qr_code_url?: string;
}

export interface ToolUnitStatusLogEntry {
  id: string;
  unidad_id: string;
  estado_anterior: EstadoUnidad;
  estado_nuevo: EstadoUnidad;
  fotos_urls?: string[];
  autor_id: string;
  created_at: string;
}

export interface UpdateUnitStatusInput {
  estado_nuevo: EstadoUnidad;
  fotos_urls?: string[];
}
