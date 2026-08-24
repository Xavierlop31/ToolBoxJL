import { Inject, Injectable } from "@nestjs/common";
import type { EstadoUnidad, ToolUnitStatusLogEntry } from "@toolboxjl/shared-types";
import {
  TOOL_UNIT_REPOSITORY,
  TOOL_UNIT_STATUS_LOG_REPOSITORY,
} from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";
import type { ToolUnitStatusLogRepository } from "../domain/tool-unit-status-log.repository";
import { UnidadNoEncontradaError } from "../domain/errors/unidad-no-encontrada.error";

/**
 * RF-1.3 — PATCH /inventory/units/{id}/status (almacenista, repartidor).
 * Actualiza el estado de desgaste de la unidad y registra la entrada
 * correspondiente en su hoja de vida (fecha + autor + fotos opcionales).
 *
 * Cualquiera de los 5 estados de `EstadoUnidad` es una transición válida
 * (el escenario Gherkin RF-1.3 no exige una máquina de estados estricta con
 * transiciones prohibidas — docs/DESIGN.md §6.1 describe un flujo típico,
 * no reglas de validación obligatorias — así que no se inventa una regla no
 * pedida por el criterio de aceptación).
 */
@Injectable()
export class ActualizarEstadoUnidadUseCase {
  constructor(
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(TOOL_UNIT_STATUS_LOG_REPOSITORY)
    private readonly hojaDeVida: ToolUnitStatusLogRepository,
  ) {}

  async ejecutar(
    unidadId: string,
    estadoNuevo: EstadoUnidad,
    fotosUrls: string[],
    autorId: string,
  ): Promise<ToolUnitStatusLogEntry> {
    const unidadActual = await this.unidades.buscarPorId(unidadId);
    if (!unidadActual) {
      throw new UnidadNoEncontradaError(unidadId);
    }

    const estadoAnterior = unidadActual.estado;
    await this.unidades.actualizarEstado(unidadId, estadoNuevo);

    return this.hojaDeVida.crear({
      unidadId,
      estadoAnterior,
      estadoNuevo,
      fotosUrls: fotosUrls ?? [],
      autorId,
    });
  }
}
