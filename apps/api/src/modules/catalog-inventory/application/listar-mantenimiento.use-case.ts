import { Inject, Injectable } from "@nestjs/common";
import type { UnidadMantenimiento } from "@toolboxjl/shared-types";
import {
  QR_CODE_GENERATOR,
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
  TOOL_UNIT_STATUS_LOG_REPOSITORY,
} from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";
import type { ToolModelRepository } from "../domain/tool-model.repository";
import type { ToolUnitStatusLogRepository } from "../domain/tool-unit-status-log.repository";
import type { QrCodeGenerator } from "../domain/qr-code-generator";

const ESTADOS_TALLER = new Set(["En Mantenimiento", "Dado de Baja"]);

/**
 * `GET /inventory/maintenance` (HU-13.3, Sprint 14) — pestaña "Mantenimiento
 * & Taller": unidades `En Mantenimiento`/`Dado de Baja`, con `modelo_nombre`
 * y el evento más reciente de su hoja de vida que tenga poblado alguno de
 * los campos de taller/baja (`tipo_mantenimiento`/`motivo_baja` — ver
 * openapi.yaml, descripción del endpoint: "poblados por
 * PATCH /inventory/units/{id}/status").
 */
@Injectable()
export class ListarMantenimientoUseCase {
  constructor(
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly modelos: ToolModelRepository,
    @Inject(TOOL_UNIT_STATUS_LOG_REPOSITORY)
    private readonly hojaDeVida: ToolUnitStatusLogRepository,
    @Inject(QR_CODE_GENERATOR)
    private readonly qr: QrCodeGenerator,
  ) {}

  async ejecutar(): Promise<UnidadMantenimiento[]> {
    const [todasLasUnidades, todosLosModelos] = await Promise.all([
      this.unidades.listarTodos(),
      this.modelos.buscar({}),
    ]);
    const modeloPorId = new Map(todosLosModelos.map((m) => [m.id, m]));

    const enTaller = todasLasUnidades.filter((u) => ESTADOS_TALLER.has(u.estado));

    return Promise.all(
      enTaller.map(async (unidad): Promise<UnidadMantenimiento> => {
        const modelo = modeloPorId.get(unidad.modelo_id);
        const historial = await this.hojaDeVida.listarPorUnidad(unidad.id);

        const eventosDeMantenimiento = historial
          .filter((e) => e.tipo_mantenimiento !== null || e.motivo_baja !== null)
          .sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );

        return {
          ...unidad,
          qr_code_url: await this.qr.generar(unidad.id),
          modelo_nombre: modelo?.nombre ?? "",
          ultimo_evento_mantenimiento: eventosDeMantenimiento[0],
        };
      }),
    );
  }
}
