import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { EstadoOrden, Order } from "@toolboxjl/shared-types";
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

  async actualizarEstado(id: string, estado: EstadoOrden): Promise<Order> {
    const orden = this.ordenes.get(id);
    if (!orden) {
      throw new Error(`No existe una orden con id "${id}".`);
    }
    const actualizada: Order = { ...orden, estado };
    this.ordenes.set(id, actualizada);
    return actualizada;
  }

  async listarVencidasSinMora(ahora: Date): Promise<Order[]> {
    return [...this.ordenes.values()].filter(
      (orden) =>
        ["confirmada", "en_curso"].includes(orden.estado) &&
        !!orden.fecha_fin &&
        new Date(orden.fecha_fin) < ahora,
    );
  }

  async extenderFecha(id: string, nuevaFechaFin: string): Promise<Order> {
    const orden = this.ordenes.get(id);
    if (!orden) {
      throw new Error(`No existe una orden con id "${id}".`);
    }
    const actualizada: Order = { ...orden, fecha_fin: nuevaFechaFin };
    this.ordenes.set(id, actualizada);
    return actualizada;
  }

  async listarUnidadesEnAlquilerActivo(): Promise<string[]> {
    const unidadesIds: string[] = [];
    for (const orden of this.ordenes.values()) {
      if (["confirmada", "en_curso"].includes(orden.estado)) {
        for (const item of orden.items) {
          unidadesIds.push(item.unidad_id);
        }
      }
    }
    return unidadesIds;
  }

  async listarPorCliente(
    clienteId: string,
    filtro: { estado?: EstadoOrden; page: number; pageSize: number },
  ): Promise<{ items: Order[]; total: number }> {
    // El Map preserva el orden de inserción (más antigua primero); se
    // invierte para simular "más reciente primero" sin depender de un campo
    // `created_at` propio (el `Order` de dominio no lo expone, ver
    // openapi.yaml `#/components/schemas/Order`) — mismo criterio de
    // ordenamiento que la implementación Prisma, que sí ordena por el
    // `createdAt` interno de la tabla.
    const todas = [...this.ordenes.values()]
      .filter(
        (orden) =>
          orden.cliente_id === clienteId &&
          (!filtro.estado || orden.estado === filtro.estado),
      )
      .reverse();
    const inicio = (filtro.page - 1) * filtro.pageSize;
    return {
      items: todas.slice(inicio, inicio + filtro.pageSize),
      total: todas.length,
    };
  }
}
