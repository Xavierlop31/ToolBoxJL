import type { EstadoUnidad, ToolUnitStatusLogEntry } from "@toolboxjl/shared-types";

export interface NuevaEntradaHojaDeVidaInput {
  unidadId: string;
  estadoAnterior: EstadoUnidad | null;
  estadoNuevo: EstadoUnidad;
  fotosUrls: string[];
  autorId: string;
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
