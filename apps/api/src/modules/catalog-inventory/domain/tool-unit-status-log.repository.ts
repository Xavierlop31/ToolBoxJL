import type {
  EstadoUnidad,
  TipoMantenimiento,
  ToolUnitStatusLogEntry,
} from "@toolboxjl/shared-types";

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
}
