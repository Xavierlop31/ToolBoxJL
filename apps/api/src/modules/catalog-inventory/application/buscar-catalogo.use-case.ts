import { Inject, Injectable } from "@nestjs/common";
import type { ToolModel } from "@toolboxjl/shared-types";
import { TOOL_MODEL_REPOSITORY } from "../infrastructure/catalog-inventory.tokens";
import type {
  FiltroBusquedaCatalogo,
  ToolModelRepository,
} from "../domain/tool-model.repository";

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
 */
@Injectable()
export class BuscarCatalogoUseCase {
  constructor(
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly repositorio: ToolModelRepository,
  ) {}

  async ejecutar(filtro: FiltroBusquedaCatalogo): Promise<ToolModel[]> {
    return this.repositorio.buscar(filtro);
  }
}
