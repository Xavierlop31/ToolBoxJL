import type { Hallazgo, InspectionChecklist, TipoInspeccion } from "@toolboxjl/shared-types";

export interface NuevoInspectionChecklistInput {
  unidadId: string;
  shipmentId: string;
  tipo: TipoInspeccion;
  hallazgos: Hallazgo[];
  fotosUrls: string[];
  garantiaEjecutada: boolean;
}

/**
 * Puerto de repositorio para `InspectionChecklist` (Clean Architecture: el
 * dominio declara la interfaz, `infrastructure/` la implementa dos veces —
 * Prisma para runtime real, in-memory para los steps de Cucumber — mismo
 * patrón que el resto de los repositorios de este repo).
 *
 * Tabla append-only (docs/DESIGN.md §4.2, mismo criterio que
 * `tool_unit_status_log`): no hay método de actualización ni borrado — un
 * checklist, una vez registrado, no se edita.
 */
export interface InspectionChecklistRepository {
  crear(input: NuevoInspectionChecklistInput): Promise<InspectionChecklist>;
}
