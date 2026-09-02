import { Inject, Injectable } from "@nestjs/common";
import type {
  EstadoUnidad,
  TipoMantenimiento,
  ToolUnitStatusLogEntry,
} from "@toolboxjl/shared-types";
import {
  TOOL_UNIT_REPOSITORY,
  TOOL_UNIT_STATUS_LOG_REPOSITORY,
} from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";
import type { ToolUnitStatusLogRepository } from "../domain/tool-unit-status-log.repository";
import { UnidadNoEncontradaError } from "../domain/errors/unidad-no-encontrada.error";

/**
 * Sprint 14 (HU-13.3) — campos opcionales de la orden de taller/baja. Ver
 * doc-comment de `ToolUnitStatusLogEntry` (`@toolboxjl/shared-types`) sobre
 * cuándo aplica cada uno; el backend no valida la correspondencia
 * estado↔campos (decisión explícita del contrato, ver `PATCH
 * /inventory/units/{id}/status` en openapi.yaml).
 */
export interface DatosMantenimiento {
  tipoMantenimiento?: TipoMantenimiento | null;
  fallaReportada?: string | null;
  tecnicoAsignado?: string | null;
  costoEstimado?: number | null;
  fechaPrevistaFin?: string | null;
  motivoBaja?: string | null;
}

/**
 * RF-1.3 — PATCH /inventory/units/{id}/status (almacenista, repartidor,
 * admin desde Sprint 14 — HU-13.3). Actualiza el estado de desgaste de la
 * unidad y registra la entrada correspondiente en su hoja de vida (fecha +
 * autor + fotos opcionales + datos de taller/baja opcionales).
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
    datosMantenimiento: DatosMantenimiento = {},
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
      tipoMantenimiento: datosMantenimiento.tipoMantenimiento,
      fallaReportada: datosMantenimiento.fallaReportada,
      tecnicoAsignado: datosMantenimiento.tecnicoAsignado,
      costoEstimado: datosMantenimiento.costoEstimado,
      fechaPrevistaFin: datosMantenimiento.fechaPrevistaFin,
      motivoBaja: datosMantenimiento.motivoBaja,
    });
  }
}
