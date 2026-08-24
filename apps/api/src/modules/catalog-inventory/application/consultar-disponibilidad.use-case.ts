import { Inject, Injectable } from "@nestjs/common";
import { TOOL_UNIT_REPOSITORY } from "../infrastructure/catalog-inventory.tokens";
import type { ToolUnitRepository } from "../domain/tool-unit.repository";

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
 * Mantenimiento" ni "Dado de Baja" (RF-1.4: "unidades físicas no
 * reservadas en ese rango").
 *
 * *** Decisión explícita del Tech Lead (punto 6): *** todavía no existe una
 * tabla de reservas/órdenes (llega en Sprint 2 con PricingModule/`orders`),
 * así que por ahora esto NO resta unidades reservadas en el rango
 * `fecha_inicio`/`fecha_fin` — no hay de dónde. `fecha_inicio`/`fecha_fin`
 * se aceptan (son requeridos por el contrato openapi.yaml) pero no afectan
 * todavía el cálculo. Revisar este use case en Sprint 2 cuando exista la
 * tabla de órdenes: ahí sí hay que excluir unidades con una reserva vigente
 * que se solape con el rango solicitado.
 *
 * Sin respuesta 404 declarada en openapi.yaml para este endpoint (solo
 * 401): si el modelo no existe, se responde 0 unidades disponibles en vez
 * de lanzar un error, ya que el contrato no define un camino de error para
 * ese caso.
 */
@Injectable()
export class ConsultarDisponibilidadUseCase {
  constructor(
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
  ) {}

  async ejecutar(
    modeloId: string,
    _fechaInicio: string,
    _fechaFin: string,
  ): Promise<DisponibilidadModelo> {
    const unidadesDelModelo = await this.unidades.listarPorModelo(modeloId);
    const disponibles = unidadesDelModelo.filter(
      (u) => !ESTADOS_NO_DISPONIBLES.has(u.estado),
    );

    return {
      modelo_id: modeloId,
      unidades_disponibles: disponibles.length,
    };
  }
}
