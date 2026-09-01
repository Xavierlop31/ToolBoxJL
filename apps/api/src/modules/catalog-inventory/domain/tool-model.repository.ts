import type { ToolModel, ToolModelInput } from "@toolboxjl/shared-types";

/** Filtro de búsqueda de catálogo (GET /catalog/search). */
export interface FiltroBusquedaCatalogo {
  q?: string;
  categoria?: string;
}

/** Resultado paginado de `buscarPaginado` — Sprint 12, HU-12.1. */
export interface ResultadoBusquedaCatalogoPaginado {
  items: ToolModel[];
  total: number;
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
  /**
   * Sprint 12 (HU-12.1) — variante paginada de `buscar()`, usada por
   * `GET /catalog/search` cuando el request trae `page`/`pageSize`. `page`
   * es 1-based. Devuelve además `total`: el conteo real sin paginar, para
   * el header de respuesta `X-Total-Count`. No reemplaza `buscar()` (que se
   * mantiene sin cambios para los Agentes 2/3, que la consumen siempre sin
   * paginar vía tool calling).
   */
  buscarPaginado(
    filtro: FiltroBusquedaCatalogo,
    page: number,
    pageSize: number,
  ): Promise<ResultadoBusquedaCatalogoPaginado>;
}
