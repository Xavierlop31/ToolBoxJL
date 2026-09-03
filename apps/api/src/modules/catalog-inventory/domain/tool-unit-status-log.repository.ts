import type {
  EstadoUnidad,
  TipoMantenimiento,
  ToolUnitStatusLogEntry,
} from "@toolboxjl/shared-types";
// Import de solo tipo, cross-bounded-context (Sprint 15, Issue #153,
// HU-15.1) — `RangoPeriodo` es un `{ desde, hasta }` genérico, no un
// concepto propio de AnalyticsModule; se reutiliza en vez de duplicar la
// interfaz porque es exactamente el mismo contrato de rango de fechas que ya
// usa `contarTransicionesAMantenimiento` de este puerto. Al ser
// `import type`, no crea ninguna dependencia de wiring/runtime entre
// CatalogInventoryModule y AnalyticsModule (TypeScript lo borra en el
// build) — mismo criterio que el resto de los `import type` cruzados entre
// capas `domain/` de este repo.
import type { RangoPeriodo } from "../../analytics/domain/revenue.repository";

export interface NuevaEntradaHojaDeVidaInput {
  unidadId: string;
  estadoAnterior: EstadoUnidad | null;
  estadoNuevo: EstadoUnidad;
  fotosUrls: string[];
  autorId: string;
  /** Sprint 14 (HU-13.3) — ver doc-comment de `ToolUnitStatusLogEntry` sobre cuándo aplica cada uno. */
  tipoMantenimiento?: TipoMantenimiento | null;
  fallaReportada?: string | null;
  tecnicoAsignado?: string | null;
  costoEstimado?: number | null;
  fechaPrevistaFin?: string | null;
  motivoBaja?: string | null;
}

/**
 * Puerto de repositorio para `ToolUnitStatusLog` — tabla append-only
 * (docs/DESIGN.md §4.2): solo `crear`/lectura, sin update/delete a
 * propósito, ni acá ni en las implementaciones de infrastructure/.
 */
export interface ToolUnitStatusLogRepository {
  crear(input: NuevaEntradaHojaDeVidaInput): Promise<ToolUnitStatusLogEntry>;
  listarPorUnidad(unidadId: string): Promise<ToolUnitStatusLogEntry[]>;
  /**
   * Sprint 15 (Issue #153, HU-15.1) — cantidad de transiciones a
   * `estado_nuevo = "En Mantenimiento"` por unidad, dentro de `rango`.
   * Usado por `ObtenerDashboardKpisUseCase` (AnalyticsModule) para el
   * disparador de alerta `mantenimiento_recurrente` (más de 3 en el mes
   * calendario actual). Solo devuelve unidades con AL MENOS 1 transición en
   * el rango (sin ceros) — el filtro de "más de 3" lo aplica el caso de uso
   * que invoca este método, no este puerto.
   */
  contarTransicionesAMantenimiento(
    rango: RangoPeriodo,
  ): Promise<{ unidadId: string; cantidad: number }[]>;
}
