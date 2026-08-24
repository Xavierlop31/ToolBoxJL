import { Inject, Injectable } from "@nestjs/common";
import type { ToolUnit } from "@toolboxjl/shared-types";
import {
  QR_CODE_GENERATOR,
  TOOL_UNIT_REPOSITORY,
} from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";
import type { QrCodeGenerator } from "../domain/qr-code-generator";
import { UnidadNoEncontradaError } from "../domain/errors/unidad-no-encontrada.error";

/**
 * GET /inventory/units/{id} (almacenista, repartidor) — ficha de una unidad
 * al escanear su QR.
 *
 * Nota: la descripción narrativa del endpoint en openapi.yaml menciona "su
 * hoja de vida resumida", pero el schema `ToolUnit` (fuente de verdad de
 * mayor autoridad — PROMPT_IMPLEMENTACION.md A.1) no declara ningún campo
 * para eso. Se devuelve exactamente la forma de `ToolUnit` del contrato, sin
 * inventar un campo no declarado; la hoja de vida completa se puede pedir
 * por separado si un sprint futuro define un endpoint para ella.
 */
@Injectable()
export class ObtenerUnidadUseCase {
  constructor(
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(QR_CODE_GENERATOR)
    private readonly qr: QrCodeGenerator,
  ) {}

  async ejecutar(id: string): Promise<ToolUnit> {
    const unidad = await this.unidades.buscarPorId(id);
    if (!unidad) {
      throw new UnidadNoEncontradaError(id);
    }
    const qrCodeUrl = await this.qr.generar(unidad.id);
    return { ...unidad, qr_code_url: qrCodeUrl };
  }
}
