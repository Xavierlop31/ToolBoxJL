import { Inject, Injectable } from "@nestjs/common";
import type { ToolModel } from "@toolboxjl/shared-types";
import { TOOL_MODEL_REPOSITORY } from "../infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../domain/tool-model.repository";
import { ModeloNoEncontradoError } from "../domain/errors/modelo-no-encontrado.error";

/** GET /catalog/models/{id} (público) — ficha técnica completa de un modelo. */
@Injectable()
export class ObtenerModeloPorIdUseCase {
  constructor(
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly repositorio: ToolModelRepository,
  ) {}

  async ejecutar(id: string): Promise<ToolModel> {
    const modelo = await this.repositorio.buscarPorId(id);
    if (!modelo) {
      throw new ModeloNoEncontradoError(id);
    }
    return modelo;
  }
}
