import { Injectable } from "@nestjs/common";
import type { ToolUnit as PrismaToolUnit } from "@prisma/client";
import type { EstadoUnidad } from "@toolboxjl/shared-types";
import type {
  NuevaUnidadInput,
  ToolUnitRepository,
  UnidadPersistida,
} from "../../domain/tool-unit.repository";
import { PrismaService } from "./prisma.service";
import { estadoADominio, estadoAPrisma } from "./estado-unidad.mapper";

function aDominio(u: PrismaToolUnit): UnidadPersistida {
  return {
    id: u.id,
    modelo_id: u.modeloId,
    numero_serie: u.numeroSerie,
    estado: estadoADominio(u.estado),
    fecha_ingreso: u.fechaIngreso.toISOString().slice(0, 10),
  };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de `ToolUnitRepository`.
 * Requiere `DATABASE_URL` (ver `PrismaService`) — no se usa en tests/BDD.
 */
@Injectable()
export class PrismaToolUnitRepository implements ToolUnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: NuevaUnidadInput): Promise<UnidadPersistida> {
    const creado = await this.prisma.toolUnit.create({
      data: {
        modeloId: input.modeloId,
        numeroSerie: input.numeroSerie,
      },
    });
    return aDominio(creado);
  }

  async buscarPorId(id: string): Promise<UnidadPersistida | null> {
    const encontrado = await this.prisma.toolUnit.findUnique({ where: { id } });
    return encontrado ? aDominio(encontrado) : null;
  }

  async actualizarEstado(
    id: string,
    estadoNuevo: EstadoUnidad,
  ): Promise<UnidadPersistida> {
    const actualizado = await this.prisma.toolUnit.update({
      where: { id },
      data: { estado: estadoAPrisma(estadoNuevo) },
    });
    return aDominio(actualizado);
  }

  async listarPorModelo(modeloId: string): Promise<UnidadPersistida[]> {
    const unidades = await this.prisma.toolUnit.findMany({
      where: { modeloId },
    });
    return unidades.map(aDominio);
  }
}
