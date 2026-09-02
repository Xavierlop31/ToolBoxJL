import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { ToolUnitStatusLogEntry } from "@toolboxjl/shared-types";
import type {
  NuevaEntradaHojaDeVidaInput,
  ToolUnitStatusLogRepository,
} from "../../domain/tool-unit-status-log.repository";

/**
 * Implementación en memoria de `ToolUnitStatusLogRepository` — usada SOLO
 * por los tests unitarios y los steps de Cucumber. Tabla append-only: solo
 * expone `crear`/`listarPorUnidad`, sin update/delete, igual que la
 * implementación real de Prisma.
 */
@Injectable()
export class InMemoryToolUnitStatusLogRepository
  implements ToolUnitStatusLogRepository
{
  private readonly entradas: ToolUnitStatusLogEntry[] = [];

  async crear(
    input: NuevaEntradaHojaDeVidaInput,
  ): Promise<ToolUnitStatusLogEntry> {
    const entrada: ToolUnitStatusLogEntry = {
      id: randomUUID(),
      unidad_id: input.unidadId,
      estado_anterior: input.estadoAnterior,
      estado_nuevo: input.estadoNuevo,
      fotos_urls: input.fotosUrls,
      autor_id: input.autorId,
      created_at: new Date().toISOString(),
      tipo_mantenimiento: input.tipoMantenimiento ?? null,
      falla_reportada: input.fallaReportada ?? null,
      tecnico_asignado: input.tecnicoAsignado ?? null,
      costo_estimado: input.costoEstimado ?? null,
      fecha_prevista_fin: input.fechaPrevistaFin ?? null,
      motivo_baja: input.motivoBaja ?? null,
    };
    this.entradas.push(entrada);
    return entrada;
  }

  async listarPorUnidad(unidadId: string): Promise<ToolUnitStatusLogEntry[]> {
    return this.entradas.filter((e) => e.unidad_id === unidadId);
  }
}
