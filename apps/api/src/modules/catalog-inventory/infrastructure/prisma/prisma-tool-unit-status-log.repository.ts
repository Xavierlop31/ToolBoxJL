import { Injectable } from "@nestjs/common";
import type { ToolUnitStatusLog as PrismaLog } from "@prisma/client";
import type { TipoMantenimiento, ToolUnitStatusLogEntry } from "@toolboxjl/shared-types";
import type {
  NuevaEntradaHojaDeVidaInput,
  ToolUnitStatusLogRepository,
} from "../../domain/tool-unit-status-log.repository";
import { PrismaService } from "./prisma.service";
import { estadoADominio, estadoAPrisma } from "./estado-unidad.mapper";

function aDominio(log: PrismaLog): ToolUnitStatusLogEntry {
  return {
    id: log.id,
    unidad_id: log.unidadId,
    estado_anterior: log.estadoAnterior ? estadoADominio(log.estadoAnterior) : null,
    estado_nuevo: estadoADominio(log.estadoNuevo),
    fotos_urls: log.fotosUrls,
    autor_id: log.autorId,
    created_at: log.createdAt.toISOString(),
    tipo_mantenimiento: log.tipoMantenimiento as TipoMantenimiento | null,
    falla_reportada: log.fallaReportada,
    tecnico_asignado: log.tecnicoAsignado,
    costo_estimado: log.costoEstimado,
    fecha_prevista_fin: log.fechaPrevistaFin
      ? log.fechaPrevistaFin.toISOString().slice(0, 10)
      : null,
    motivo_baja: log.motivoBaja,
  };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de
 * `ToolUnitStatusLogRepository`. Tabla append-only: solo `crear`/lectura,
 * sin update/delete. Requiere `DATABASE_URL` — no se usa en tests/BDD.
 */
@Injectable()
export class PrismaToolUnitStatusLogRepository
  implements ToolUnitStatusLogRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async crear(
    input: NuevaEntradaHojaDeVidaInput,
  ): Promise<ToolUnitStatusLogEntry> {
    const creado = await this.prisma.toolUnitStatusLog.create({
      data: {
        unidadId: input.unidadId,
        estadoAnterior: input.estadoAnterior
          ? estadoAPrisma(input.estadoAnterior)
          : null,
        estadoNuevo: estadoAPrisma(input.estadoNuevo),
        fotosUrls: input.fotosUrls,
        autorId: input.autorId,
        tipoMantenimiento: input.tipoMantenimiento ?? undefined,
        fallaReportada: input.fallaReportada ?? undefined,
        tecnicoAsignado: input.tecnicoAsignado ?? undefined,
        costoEstimado: input.costoEstimado ?? undefined,
        fechaPrevistaFin: input.fechaPrevistaFin
          ? new Date(input.fechaPrevistaFin)
          : undefined,
        motivoBaja: input.motivoBaja ?? undefined,
      },
    });
    return aDominio(creado);
  }

  async listarPorUnidad(unidadId: string): Promise<ToolUnitStatusLogEntry[]> {
    const logs = await this.prisma.toolUnitStatusLog.findMany({
      where: { unidadId },
      orderBy: { createdAt: "asc" },
    });
    return logs.map(aDominio);
  }
}
