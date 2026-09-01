import { Inject, Injectable } from "@nestjs/common";
import type { ToolModel } from "@toolboxjl/shared-types";
import { TOOL_MODEL_REPOSITORY } from "../infrastructure/catalog-inventory.tokens";
import type {
  FiltroBusquedaCatalogo,
  ToolModelRepository,
} from "../domain/tool-model.repository";

/** Input de `BuscarCatalogoUseCase.ejecutar` — filtro + paginación opcional. */
export interface BuscarCatalogoInput extends FiltroBusquedaCatalogo {
  page?: number;
  pageSize?: number;
}

/**
 * Resultado de `BuscarCatalogoUseCase.ejecutar`. `total` solo viene
 * presente cuando el request pidió paginación (`page`/`pageSize`) — así el
 * controller sabe si debe setear el header `X-Total-Count` (HU-12.1).
 */
export interface ResultadoBusquedaCatalogo {
  items: ToolModel[];
  total?: number;
}

/**
 * GET /catalog/search (público, también usado por el Agente 3 vía tool
 * calling en Sprint 9). Filtra por texto libre (`q`, contra nombre/marca/
 * categoría) y por `categoria` exacta.
 *
 * Decisión documentada: `fecha_inicio`/`fecha_fin` están declarados como
 * parámetros de este endpoint en openapi.yaml, pero ningún escenario Gherkin
 * de RF-1.x exige que /catalog/search filtre por disponibilidad en un rango
 * de fechas — esa lógica es RF-1.4 y vive en
 * GET /inventory/check-availability (ConsultarDisponibilidadUseCase). Acá se
 * aceptan esos query params por conformidad con el contrato pero no afectan
 * el resultado; si un sprint futuro define un escenario que lo requiera, se
 * cablean en este mismo use case.
 *
 * Sprint 12 (HU-12.1): `page`/`pageSize` son opcionales — sin ellos, el
 * comportamiento es IDÉNTICO al histórico (array completo sin paginar, el
 * que consumen los Agentes 2/3 vía tool calling, que nunca envían estos
 * parámetros). Con ellos, delega en `buscarPaginado()` del repositorio.
 */
@Injectable()
export class BuscarCatalogoUseCase {
  constructor(
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly repositorio: ToolModelRepository,
  ) {}

  async ejecutar(filtro: BuscarCatalogoInput): Promise<ResultadoBusquedaCatalogo> {
    const { page, pageSize, ...resto } = filtro;
    if (page && pageSize) {
      return this.repositorio.buscarPaginado(resto, page, pageSize);
    }
    const items = await this.repositorio.buscar(resto);
    return { items };
  }
}
