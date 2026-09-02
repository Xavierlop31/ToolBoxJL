import { Inject, Injectable } from "@nestjs/common";
import type { InventoryMetrics } from "@toolboxjl/shared-types";
import { TOOL_UNIT_REPOSITORY } from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";
import { calcularEstadoVisualizacionUnidad } from "../domain/estado-visualizacion-unidad";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";

/**
 * `GET /inventory/metrics` (HU-13.1, Sprint 14) — las 4 tarjetas de KPIs del
 * panel de inventario. Mismo cruce con `OrderRepository` que
 * `ListarUnidadesUseCase` para "en_alquiler" (ver su doc-comment sobre por
 * qué se resuelve en memoria acá y no en el repositorio).
 */
@Injectable()
export class ObtenerMetricasInventarioUseCase {
  constructor(
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
  ) {}

  async ejecutar(): Promise<InventoryMetrics> {
    const [todasLasUnidades, idsEnAlquiler] = await Promise.all([
      this.unidades.listarTodos(),
      this.ordenes.listarUnidadesEnAlquilerActivo(),
    ]);
    const enAlquilerSet = new Set(idsEnAlquiler);

    let operativas = 0;
    let enAlquiler = 0;
    let enMantenimientoOBaja = 0;

    for (const unidad of todasLasUnidades) {
      const visualizacion = calcularEstadoVisualizacionUnidad(
        unidad.estado,
        enAlquilerSet.has(unidad.id),
      );
      switch (visualizacion) {
        case "Operativo":
          operativas += 1;
          break;
        case "En Alquiler":
          enAlquiler += 1;
          break;
        case "En Mantenimiento":
        case "Dado de Baja":
          enMantenimientoOBaja += 1;
          break;
      }
    }

    return {
      total_unidades: todasLasUnidades.length,
      operativas,
      en_alquiler: enAlquiler,
      en_mantenimiento_o_baja: enMantenimientoOBaja,
    };
  }
}
