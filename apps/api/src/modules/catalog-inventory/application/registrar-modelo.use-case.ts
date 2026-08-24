import { Inject, Injectable } from "@nestjs/common";
import type { ToolModel, ToolModelInput } from "@toolboxjl/shared-types";
import { TOOL_MODEL_REPOSITORY } from "../infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../domain/tool-model.repository";

/**
 * RF-1.1 — POST /inventory/models (solo admin, aplicado por RolesGuard en
 * el controller). Da de alta la ficha técnica de un nuevo modelo de
 * herramienta con todos los campos provistos.
 */
@Injectable()
export class RegistrarModeloUseCase {
  constructor(
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly repositorio: ToolModelRepository,
  ) {}

  async ejecutar(input: ToolModelInput): Promise<ToolModel> {
    return this.repositorio.crear(input);
  }
}
