import { Inject, Injectable } from "@nestjs/common";
import type { OcupacionUbicacion } from "@toolboxjl/shared-types";
import { TOOL_UNIT_REPOSITORY } from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";

const SIN_UBICACION = "Sin ubicación asignada";

/**
 * `GET /inventory/occupancy` — widget "Ocupación de Almacén" del panel de
 * Almacén (Issue #184-bis). Agrupa `ToolUnit.ubicacion_bodega` (texto
 * libre, ver doc-comment de `ToolUnitInput`) y cuenta unidades por valor.
 *
 * Sin capacidad ni porcentaje: el sistema no tiene ningún concepto de
 * capacidad total de bodega/estante (decisión del Arquitecto, 2026-09-11) —
 * este caso de uso solo reporta el ocupado real.
 */
@Injectable()
export class ObtenerOcupacionAlmacenUseCase {
  constructor(
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
  ) {}

  async ejecutar(): Promise<OcupacionUbicacion[]> {
    const todasLasUnidades = await this.unidades.listarTodos();

    const conteo = new Map<string, number>();
    for (const unidad of todasLasUnidades) {
      const ubicacion = unidad.ubicacion_bodega?.trim() || SIN_UBICACION;
      conteo.set(ubicacion, (conteo.get(ubicacion) ?? 0) + 1);
    }

    return [...conteo.entries()]
      .map(([ubicacion, cantidad]) => ({ ubicacion, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }
}
