import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Order, TipoOrden } from "@toolboxjl/shared-types";
import type { NuevaOrdenInput, OrderRepository } from "../../domain/order.repository";

@Injectable()
export class InMemoryOrderRepository implements OrderRepository {
  private readonly ordenes = new Map<string, Order>();

  async crear(input: NuevaOrdenInput): Promise<Order> {
    const orderId = randomUUID();
    const orden: Order = {
      id: orderId,
      cliente_id: input.clienteId,
      tipo: input.tipo,
      estado: "pendiente_pago",
      fecha_inicio: input.fechaInicio,
      fecha_fin: input.fechaFin,
      return_mode: input.returnMode,
      direccion_entrega: input.direccionEntrega,
      zona_id: input.zonaId,
      items: input.items.map((item) => ({
        id: randomUUID(),
        order_id: orderId,
        unidad_id: item.unidadId,
        tarifa_aplicada: item.tarifaAplicada,
      })),
    };
    this.ordenes.set(orden.id, orden);
    return orden;
  }

  async buscarPorId(id: string): Promise<Order | null> {
    return this.ordenes.get(id) ?? null;
  }

  async obtenerUnidadesReservadasEnRango(
    modeloId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<string[]> {
    const reservadas: string[] = [];
    const inicioReq = new Date(fechaInicio);
    const finReq = new Date(fechaFin);

    for (const orden of this.ordenes.values()) {
      if (
        orden.tipo === "alquiler" &&
        ["pendiente_pago", "confirmada", "en_curso"].includes(orden.estado) &&
        orden.fecha_inicio &&
        orden.fecha_fin
      ) {
        const inicioOrd = new Date(orden.fecha_inicio);
        const finOrd = new Date(orden.fecha_fin);

        // Verificar solapamiento de fechas
        const solapa = inicioReq <= finOrd && finReq >= inicioOrd;
        if (solapa) {
          for (const item of orden.items) {
            reservadas.push(item.unidad_id);
          }
        }
      }
    }
    return reservadas;
  }

  async obtenerUnidadesConOrdenesActivas(modeloId: string): Promise<string[]> {
    const activas: string[] = [];
    for (const orden of this.ordenes.values()) {
      if (["pendiente_pago", "confirmada", "en_curso"].includes(orden.estado)) {
        for (const item of orden.items) {
          activas.push(item.unidad_id);
        }
      }
    }
    return activas;
  }
}
