import { Inject, Injectable } from "@nestjs/common";
import type { ToolUnitStatusLogEntry } from "@toolboxjl/shared-types";
import {
  TOOL_UNIT_REPOSITORY,
  TOOL_UNIT_STATUS_LOG_REPOSITORY,
} from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";
import type { ToolUnitStatusLogRepository } from "../domain/tool-unit-status-log.repository";
import { UnidadNoEncontradaError } from "../domain/errors/unidad-no-encontrada.error";

/**
 * `GET /inventory/units/{id}/history` (HU-13.1, botón "Historial" — gap
 * detectado por el frontend, ver openapi.yaml commit
 * `498963e`/PR #171: `GET /inventory/units/{id}` describía una "hoja de
 * vida resumida" que nunca llegó a declararse en `ToolUnit`).
 *
 * Reutiliza `ToolUnitStatusLogRepository.listarPorUnidad` (el mismo puerto
 * que ya usa `ActualizarEstadoUnidadUseCase` para crear entradas) — no hizo
 * falta ningún método nuevo de repositorio. `listarPorUnidad` devuelve orden
 * ASCENDENTE por `created_at` (ver `PrismaToolUnitStatusLogRepository`,
 * `orderBy: { createdAt: "asc" }`, y la implementación in-memory, que
 * preserva el orden de inserción) porque así lo necesitaba
 * `ListarMantenimientoUseCase` (Sprint 14) — acá se invierte a DESCENDENTE
 * (más reciente primero) sin tocar el contrato del repositorio, mismo
 * criterio que `ListarMantenimientoUseCase`.
 *
 * *** Empates de `created_at` ***: con precisión de milisegundo (Date/
 * timestamptz), 2 entradas creadas en sucesión muy rápida (mismo request,
 * tests, o un PATCH y otro casi simultáneos) pueden compartir el mismo
 * `created_at` exacto. Ordenar DIRECTO por comparador descendente
 * (`b - a`) deja esos empates en su orden de aparición ORIGINAL (sort
 * estable de V8/ES2019+ con comparador `0`), que es ascendente — el
 * resultado final quedaría con el más VIEJO de los empatados primero,
 * al revés de lo que pide el contrato. Por eso acá se ordena ASCENDENTE
 * (`a - b`, empates preservan el orden de inserción real, que sí es
 * cronológicamente correcto) y recién DESPUÉS se invierte con `.reverse()`
 * — así, ante un empate, gana el insertado más tarde, no un resultado
 * dependiente del timing del proceso (ver el spec de este caso de uso,
 * detectado al correr la suite completa de Jest en paralelo con otros
 * módulos, donde sí llegó a colisionar).
 *
 * openapi.yaml declara 404 para este endpoint (a diferencia de
 * `GET /inventory/units/{id}/status`, que no lo hace) — se valida que la
 * unidad exista antes de listar su hoja de vida, aunque
 * `listarPorUnidad("id-inexistente")` de por sí devolvería `[]` sin
 * distinguir "unidad sin historial" de "unidad inexistente".
 */
@Injectable()
export class ObtenerHistorialUnidadUseCase {
  constructor(
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(TOOL_UNIT_STATUS_LOG_REPOSITORY)
    private readonly hojaDeVida: ToolUnitStatusLogRepository,
  ) {}

  async ejecutar(unidadId: string): Promise<ToolUnitStatusLogEntry[]> {
    const unidad = await this.unidades.buscarPorId(unidadId);
    if (!unidad) {
      throw new UnidadNoEncontradaError(unidadId);
    }

    const historial = await this.hojaDeVida.listarPorUnidad(unidadId);
    return [...historial]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .reverse();
  }
}
