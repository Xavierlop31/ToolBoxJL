import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { EstadoUnidad } from "@toolboxjl/shared-types";
import type {
  NuevaUnidadInput,
  ToolUnitRepository,
  UnidadPersistida,
} from "../../domain/tool-unit.repository";

/**
 * Implementación en memoria de `ToolUnitRepository` — usada SOLO por los
 * tests unitarios y los steps de Cucumber. No usar en runtime de producción.
 */
@Injectable()
export class InMemoryToolUnitRepository implements ToolUnitRepository {
  private readonly unidades = new Map<string, UnidadPersistida>();

  async crear(input: NuevaUnidadInput): Promise<UnidadPersistida> {
    const unidad: UnidadPersistida = {
      id: randomUUID(),
      modelo_id: input.modeloId,
      numero_serie: input.numeroSerie,
      estado: "Nuevo",
      fecha_ingreso: new Date().toISOString().slice(0, 10),
    };
    this.unidades.set(unidad.id, unidad);
    return unidad;
  }

  async buscarPorId(id: string): Promise<UnidadPersistida | null> {
    return this.unidades.get(id) ?? null;
  }

  async actualizarEstado(
    id: string,
    estadoNuevo: EstadoUnidad,
  ): Promise<UnidadPersistida> {
    const actual = this.unidades.get(id);
    if (!actual) {
      throw new Error(`InMemoryToolUnitRepository: unidad "${id}" no existe.`);
    }
    const actualizada: UnidadPersistida = { ...actual, estado: estadoNuevo };
    this.unidades.set(id, actualizada);
    return actualizada;
  }

  async listarPorModelo(modeloId: string): Promise<UnidadPersistida[]> {
    return [...this.unidades.values()].filter((u) => u.modelo_id === modeloId);
  }
}
