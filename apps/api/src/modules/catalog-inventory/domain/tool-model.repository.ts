import type { ToolModel, ToolModelInput } from "@toolboxjl/shared-types";

/** Filtro de búsqueda de catálogo (GET /catalog/search). */
export interface FiltroBusquedaCatalogo {
  q?: string;
  categoria?: string;
}

/**
 * Puerto de repositorio para `ToolModel` (Clean Architecture: el dominio
 * declara la interfaz, `infrastructure/` la implementa dos veces — Prisma
 * para runtime real, in-memory para los steps de Cucumber — ver punto 3 del
 * prompt del Tech Lead / README de este módulo).
 */
export interface ToolModelRepository {
  crear(input: ToolModelInput): Promise<ToolModel>;
  buscarPorId(id: string): Promise<ToolModel | null>;
  buscar(filtro: FiltroBusquedaCatalogo): Promise<ToolModel[]>;
}
