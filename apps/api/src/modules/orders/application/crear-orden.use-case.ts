import { Inject, Injectable } from "@nestjs/common";
import { ORDER_REPOSITORY } from "../infrastructure/orders.tokens";
import type { OrderRepository } from "../domain/order.repository";
import { TOOL_MODEL_REPOSITORY, TOOL_UNIT_REPOSITORY } from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import type { ToolUnitRepository } from "../../catalog-inventory/domain/tool-unit.repository";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { SinUnidadesDisponiblesError } from "../domain/errors/sin-unidades-disponibles.error";
import { CotizarOrdenUseCase } from "./cotizar-orden.use-case";
import type { Order, OrderInput } from "@toolboxjl/shared-types";

/** Un ítem ya resuelto (unidad física + tarifa fijada) listo para persistir en una orden. */
export interface ItemDeOrdenResuelto {
  unidadId: string;
  tarifaAplicada: number;
}

@Injectable()
export class CrearOrdenUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly modelos: ToolModelRepository,
    @Inject(TOOL_UNIT_REPOSITORY)
    private readonly unidades: ToolUnitRepository,
    private readonly cotizarOrden: CotizarOrdenUseCase,
  ) {}

  async ejecutar(clienteId: string, input: OrderInput): Promise<Order> {
    const item = await this.resolverItem(input, new Set());

    return this.ordenes.crear({
      clienteId,
      tipo: input.tipo,
      fechaInicio: input.fecha_inicio ?? null,
      fechaFin: input.fecha_fin ?? null,
      returnMode: input.return_mode,
      direccionEntrega: input.direccion_entrega,
      zonaId: input.zona_id,
      items: [item],
    });
  }

  /**
   * Selecciona una unidad física disponible del modelo + fija su tarifa
   * (misma lógica que antes vivía inline en `ejecutar`), sin persistir nada
   * todavía. Extraído (HU-12.3, checkout consolidado) para que
   * `CheckoutCartUseCase` pueda resolver varios ítems de un mismo `modelo_id`
   * — o de modelos distintos — ANTES de persistirlos juntos en una sola
   * orden.
   *
   * `excluirUnidadIds` cubre unidades ya comprometidas dentro del MISMO
   * checkout en curso (ej. `cantidad: 2` del mismo modelo, o dos líneas del
   * mismo modelo) — la DB todavía no las ve como reservadas/con orden activa
   * porque la orden real recién se persiste al final, así que sin este
   * filtro dos ítems del mismo modelo podrían elegir la misma unidad física.
   */
  async resolverItem(
    input: Pick<OrderInput, "modelo_id" | "tipo" | "fecha_inicio" | "fecha_fin" | "zona_id" | "return_mode">,
    excluirUnidadIds: Set<string>,
  ): Promise<ItemDeOrdenResuelto> {
    const modelo = await this.modelos.buscarPorId(input.modelo_id);
    if (!modelo) {
      throw new ModeloNoEncontradoError(input.modelo_id);
    }

    // 1. Obtener unidades físicas del modelo que no estén dadas de baja ni en mantenimiento
    const todasLasUnidades = await this.unidades.listarPorModelo(input.modelo_id);
    const unidadesFisicamenteDisponibles = todasLasUnidades.filter(
      (u) =>
        u.estado !== "En Mantenimiento" &&
        u.estado !== "Dado de Baja" &&
        !excluirUnidadIds.has(u.id),
    );

    if (unidadesFisicamenteDisponibles.length === 0) {
      throw new SinUnidadesDisponiblesError(input.modelo_id);
    }

    let unidadElegidaId: string | null = null;

    if (input.tipo === "alquiler") {
      if (!input.fecha_inicio || !input.fecha_fin) {
        throw new Error("Fechas requeridas para alquiler.");
      }
      // Obtener unidades reservadas en el rango
      const reservadas = await this.ordenes.obtenerUnidadesReservadasEnRango(
        input.modelo_id,
        input.fecha_inicio,
        input.fecha_fin,
      );
      const disponible = unidadesFisicamenteDisponibles.find((u) => !reservadas.includes(u.id));
      if (!disponible) {
        throw new SinUnidadesDisponiblesError(input.modelo_id);
      }
      unidadElegidaId = disponible.id;
    } else {
      // Venta: cualquier unidad sin órdenes activas
      const conOrdenesActivas = await this.ordenes.obtenerUnidadesConOrdenesActivas(input.modelo_id);
      const disponible = unidadesFisicamenteDisponibles.find((u) => !conOrdenesActivas.includes(u.id));
      if (!disponible) {
        throw new SinUnidadesDisponiblesError(input.modelo_id);
      }
      unidadElegidaId = disponible.id;
    }

    // 2. Calcular cotización para fijar la tarifa aplicada
    const cotizacion = await this.cotizarOrden.ejecutar({
      modeloId: input.modelo_id,
      tipo: input.tipo,
      fechaInicio: input.fecha_inicio,
      fechaFin: input.fecha_fin,
      zonaId: input.zona_id,
      returnMode: input.return_mode,
    });

    return { unidadId: unidadElegidaId, tarifaAplicada: cotizacion.tarifa_base };
  }
}
