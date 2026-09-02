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
 *
 * `fecha_adquisicion`/`costo_compra`/`ubicacion_bodega` (Sprint 14,
 * HU-13.2): nullable acá porque unidades creadas antes de este campo no lo
 * tienen, aunque `POST /inventory/units` los exige — ver `ToolUnitInput`.
 */
export interface ToolUnit {
  id: string;
  modelo_id: string;
  numero_serie: string;
  estado: EstadoUnidad;
  fecha_ingreso: string;
  qr_code_url: string;
  fecha_adquisicion: string | null;
  costo_compra: number | null;
  ubicacion_bodega: string | null;
}

/**
 * Payload de alta de una unidad física (POST /inventory/units, RF-1.2).
 *
 * Sprint 14 (HU-13.2): `fecha_adquisicion`/`costo_compra`/`ubicacion_bodega`
 * son REQUERIDOS por el contrato HTTP del endpoint (ver `required` en
 * openapi.yaml y `CrearUnidadDto`, que sí los declara obligatorios vía
 * class-validator). Acá, en el tipo de dominio, quedan OPCIONALES a
 * propósito: `RegistrarUnidadUseCase`/`ToolUnitRepository.crear` los aceptan
 * como `undefined` para no romper llamadores internos que no pasan por HTTP
 * (steps de Cucumber de Sprint 1 en adelante, que siembran unidades solo con
 * `modelo_id`/`numero_serie` — ver `catalogo-inventario.steps.ts`). La
 * obligatoriedad real del endpoint vive en la capa de interfaz (DTO), no acá.
 */
export interface ToolUnitInput {
  modelo_id: string;
  numero_serie: string;
  fecha_adquisicion?: string | null;
  costo_compra?: number | null;
  ubicacion_bodega?: string | null;
}

/**
 * Tipo de orden de taller registrada al pasar una unidad a "En
 * Mantenimiento" (Sprint 14, HU-13.3).
 */
export const TIPOS_MANTENIMIENTO = ["Preventivo", "Correctivo"] as const;
export type TipoMantenimiento = (typeof TIPOS_MANTENIMIENTO)[number];

/**
 * Entrada de la hoja de vida de una unidad (RF-1.3) — docs/DESIGN.md §4.1,
 * entidad `TOOL_UNIT_STATUS_LOG`; contrato de API:
 * openapi.yaml `#/components/schemas/ToolUnitStatusLogEntry`. Tabla
 * append-only: no hay operaciones de update/delete sobre estas entradas.
 *
 * Los 6 campos de mantenimiento (Sprint 14, HU-13.3) son opcionales/nullable:
 * `tipo_mantenimiento`/`falla_reportada`/`tecnico_asignado`/
 * `costo_estimado`/`fecha_prevista_fin` solo se poblan cuando `estado_nuevo`
 * es `"En Mantenimiento"`; `motivo_baja` solo cuando `estado_nuevo` es
 * `"Dado de Baja"` — el backend no lo exige por tipo (openapi.yaml, ver
 * descripción de `PATCH /inventory/units/{id}/status`), quedan `null` si se
 * omiten sea cual sea el estado.
 */
export interface ToolUnitStatusLogEntry {
  id: string;
  unidad_id: string;
  estado_anterior: EstadoUnidad | null;
  estado_nuevo: EstadoUnidad;
  fotos_urls: string[];
  autor_id: string;
  created_at: string;
  tipo_mantenimiento: TipoMantenimiento | null;
  falla_reportada: string | null;
  tecnico_asignado: string | null;
  costo_estimado: number | null;
  fecha_prevista_fin: string | null;
  motivo_baja: string | null;
}

/**
 * Estados DE VISUALIZACIÓN del panel de inventario (Sprint 14, HU-13.1) —
 * distintos del enum persistido `EstadoUnidad`: "En Alquiler" no es un valor
 * de `ToolUnit.estado`, es un cruce con Órdenes calculado en
 * `ListarUnidadesUseCase`/`ObtenerMetricasInventarioUseCase` (ver
 * openapi.yaml, descripción de `GET /inventory/units`). `Nuevo`/`Excelente`
 * (2 de los 5 valores de `EstadoUnidad`) se agrupan bajo `"Operativo"` acá —
 * el enum de visualización del contrato solo declara 4 valores, no 5, y la
 * descripción del endpoint solo distingue explícitamente `Operativo` de
 * `En Mantenimiento`/`Dado de Baja`; interpretación documentada, no
 * confirmada literalmente contra un escenario Gherkin que ejercite
 * `Nuevo`/`Excelente` en la tabla del panel.
 */
export const ESTADOS_VISUALIZACION_UNIDAD = [
  "Operativo",
  "En Alquiler",
  "En Mantenimiento",
  "Dado de Baja",
] as const;
export type EstadoVisualizacionUnidad =
  (typeof ESTADOS_VISUALIZACION_UNIDAD)[number];

/**
 * Fila de `GET /inventory/units` (HU-13.1) — `ToolUnit` expandido con los
 * datos que evitan que el panel admin haga N+1 a `GET /catalog/models/{id}`
 * por fila.
 */
export interface ToolUnitListado extends ToolUnit {
  modelo_nombre: string;
  modelo_categoria: string;
  estado_visualizacion: EstadoVisualizacionUnidad;
}

/** Envelope de `GET /inventory/units` — mismo shape que `GET /orders` (HU-12.1). */
export interface ListarUnidadesResultado {
  items: ToolUnitListado[];
  total: number;
  page: number;
  pageSize: number;
}

/** Respuesta de `GET /inventory/metrics` (HU-13.1). */
export interface InventoryMetrics {
  total_unidades: number;
  operativas: number;
  en_alquiler: number;
  en_mantenimiento_o_baja: number;
}

/**
 * Fila de `GET /inventory/maintenance` (HU-13.3). `ultimo_evento_mantenimiento`
 * queda ausente (no `null`, directamente omitido) en el caso borde de una
 * unidad `En Mantenimiento`/`Dado de Baja` cuya hoja de vida no tiene ninguna
 * entrada con los campos de mantenimiento poblados (dato legado/corrupto,
 * no un caso de negocio esperado — ver `ListarMantenimientoUseCase`).
 */
export interface UnidadMantenimiento extends ToolUnit {
  modelo_nombre: string;
  ultimo_evento_mantenimiento?: ToolUnitStatusLogEntry;
}
