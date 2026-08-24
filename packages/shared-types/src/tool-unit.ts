import type { EstadoUnidad } from "./estado-unidad";

/**
 * Unidad física serializada de un modelo de herramienta — docs/DESIGN.md
 * §4.1, entidad `TOOL_UNITS`; contrato de API:
 * openapi.yaml `#/components/schemas/ToolUnit`.
 *
 * `id` es el UUID también codificado en el QR físico impreso (RF-1.2).
 * `qr_code_url` se genera on-demand como data URI (`data:image/png;base64,...`)
 * — ver apps/api InventoryModule/infrastructure/qr — no se persiste en la
 * base de datos; siempre viene poblado en las respuestas de la API.
 */
export interface ToolUnit {
  id: string;
  modelo_id: string;
  numero_serie: string;
  estado: EstadoUnidad;
  fecha_ingreso: string;
  qr_code_url: string;
}

/** Payload de alta de una unidad física (POST /inventory/units, RF-1.2). */
export interface ToolUnitInput {
  modelo_id: string;
  numero_serie: string;
}

/**
 * Entrada de la hoja de vida de una unidad (RF-1.3) — docs/DESIGN.md §4.1,
 * entidad `TOOL_UNIT_STATUS_LOG`; contrato de API:
 * openapi.yaml `#/components/schemas/ToolUnitStatusLogEntry`. Tabla
 * append-only: no hay operaciones de update/delete sobre estas entradas.
 */
export interface ToolUnitStatusLogEntry {
  id: string;
  unidad_id: string;
  estado_anterior: EstadoUnidad | null;
  estado_nuevo: EstadoUnidad;
  fotos_urls: string[];
  autor_id: string;
  created_at: string;
}
