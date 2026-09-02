import { Inject, Injectable } from "@nestjs/common";
import type { ToolUnit, ToolUnitInput } from "@toolboxjl/shared-types";
import {
  QR_CODE_GENERATOR,
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
} from "../infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../domain/tool-model.repository";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";
import type { QrCodeGenerator } from "../domain/qr-code-generator";
import { ModeloNoEncontradoError } from "../domain/errors/modelo-no-encontrado.error";

/**
 * RF-1.2 — POST /inventory/units (almacenista, admin). Da de alta una
 * unidad física serializada de un modelo existente, con UUID propio, y
 * genera su código QR (ligado a la unidad, no al modelo).
 *
 * openapi.yaml no declara una respuesta 404 para este endpoint (solo
 * 400/401/403) — por eso, si `modelo_id` no existe, se propaga
 * `ModeloNoEncontradoError` para que el controller la traduzca a 400
 * (BadRequest), no a 404.
 */
@Injectable()
export class RegistrarUnidadUseCase {
  constructor(
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly modelos: ToolModelRepository,
    @Inject(QR_CODE_GENERATOR)
    private readonly qr: QrCodeGenerator,
  ) {}

  async ejecutar(input: ToolUnitInput): Promise<ToolUnit> {
    const modelo = await this.modelos.buscarPorId(input.modelo_id);
    if (!modelo) {
      throw new ModeloNoEncontradoError(input.modelo_id);
    }

    const unidad = await this.unidades.crear({
      modeloId: input.modelo_id,
      numeroSerie: input.numero_serie,
      fechaAdquisicion: input.fecha_adquisicion,
      costoCompra: input.costo_compra,
      ubicacionBodega: input.ubicacion_bodega,
    });

    const qrCodeUrl = await this.qr.generar(unidad.id);

    return { ...unidad, qr_code_url: qrCodeUrl };
  }
}
