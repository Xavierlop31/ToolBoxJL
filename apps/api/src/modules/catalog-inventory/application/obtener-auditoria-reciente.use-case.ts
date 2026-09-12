import { Inject, Injectable } from "@nestjs/common";
import type { AuditoriaEvento } from "@toolboxjl/shared-types";
import {
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
  TOOL_UNIT_STATUS_LOG_REPOSITORY,
} from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";
import type { ToolModelRepository } from "../domain/tool-model.repository";
import type { ToolUnitStatusLogRepository } from "../domain/tool-unit-status-log.repository";

const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 50;

/**
 * `GET /inventory/audit-feed` — widget "Auditoría en Vivo" del panel de
 * Almacén (Issue #184-bis). Reusa `ToolUnitStatusLog` (append-only, ya se
 * escribe en cada `PATCH /inventory/units/{id}/status` — ver
 * `ActualizarEstadoUnidadUseCase`), enriquecido con `numero_serie`/
 * `modelo_nombre` para que el frontend no tenga que resolverlos aparte
 * (mismo criterio que `ListarUnidadesUseCase`).
 *
 * GAP documentado (2026-09-11): solo cubre cambios de estado de unidad —
 * NO incluye despachos/recepciones de `Order`/`Shipment` (otro bounded
 * context). Un timeline unificado de "toda la actividad de la bodega"
 * requeriría cruzarlos, fuera de este alcance.
 */
@Injectable()
export class ObtenerAuditoriaRecienteUseCase {
  constructor(
    @Inject(TOOL_UNIT_STATUS_LOG_REPOSITORY)
    private readonly hojaDeVida: ToolUnitStatusLogRepository,
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly modelos: ToolModelRepository,
  ) {}

  async ejecutar(limit?: number): Promise<AuditoriaEvento[]> {
    const limiteAplicado = Math.min(limit ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);

    const [eventos, todasLasUnidades, todosLosModelos] = await Promise.all([
      this.hojaDeVida.listarRecientes(limiteAplicado),
      this.unidades.listarTodos(),
      this.modelos.buscar({}),
    ]);

    const unidadPorId = new Map(todasLasUnidades.map((u) => [u.id, u]));
    const modeloPorId = new Map(todosLosModelos.map((m) => [m.id, m]));

    return eventos.map((evento): AuditoriaEvento => {
      const unidad = unidadPorId.get(evento.unidad_id);
      const modelo = unidad ? modeloPorId.get(unidad.modelo_id) : undefined;

      return {
        id: evento.id,
        unidad_id: evento.unidad_id,
        numero_serie: unidad?.numero_serie ?? "",
        modelo_nombre: modelo?.nombre ?? "",
        estado_anterior: evento.estado_anterior,
        estado_nuevo: evento.estado_nuevo,
        created_at: evento.created_at,
        autor_id: evento.autor_id,
        falla_reportada: evento.falla_reportada,
        motivo_baja: evento.motivo_baja,
      };
    });
  }
}
