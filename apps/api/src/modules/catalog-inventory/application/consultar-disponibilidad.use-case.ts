import { Inject, Injectable } from "@nestjs/common";
import { TOOL_UNIT_REPOSITORY } from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";

export interface DisponibilidadModelo {
  modelo_id: string;
  unidades_disponibles: number;
}

const ESTADOS_NO_DISPONIBLES = new Set(["En Mantenimiento", "Dado de Baja"]);

/**
 * RF-1.4 — GET /inventory/check-availability (cliente; también agente-2 y
 * agente-3 vía tool calling desde Sprint 8/9, cuando exista el JWT de
 * servicio para agentes — ver decisión documentada en InventoryController).
 *
 * Disponibilidad = unidades del modelo cuyo `estado` no sea "En
 * Mantenimiento" ni "Dado de Baja" menos las unidades que ya tengan una
 * reserva activa en el rango de fechas solicitado.
 */
@Injectable()
export class ConsultarDisponibilidadUseCase {
  constructor(
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
  ) {}

  async ejecutar(
    modeloId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<DisponibilidadModelo> {
    const unidadesDelModelo = await this.unidades.listarPorModelo(modeloId);
    const fisicamenteDisponibles = unidadesDelModelo.filter(
      (u) => !ESTADOS_NO_DISPONIBLES.has(u.estado),
    );

    // Obtener las unidades que ya están reservadas en este rango de fechas
    const reservadasIds = await this.ordenes.obtenerUnidadesReservadasEnRango(
      modeloId,
      fechaInicio,
      fechaFin,
    );

    const realmenteDisponibles = fisicamenteDisponibles.filter(
      (u) => !reservadasIds.includes(u.id),
    );

    return {
      modelo_id: modeloId,
      unidades_disponibles: realmenteDisponibles.length,
    };
  }
}
