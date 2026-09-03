import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";
import type { Order, TipoOrden, EstadoOrden, ModoRetorno } from "@toolboxjl/shared-types";
import type { NuevaOrdenInput, OrderRepository } from "../../domain/order.repository";
import type { Order as PrismaOrder, OrderItem as PrismaOrderItem } from "@prisma/client";

function aDominio(o: PrismaOrder & { items: PrismaOrderItem[] }): Order {
  return {
    id: o.id,
    cliente_id: o.clienteId,
    tipo: o.tipo as TipoOrden,
    estado: o.estado as EstadoOrden,
    fecha_inicio: o.fechaInicio ? o.fechaInicio.toISOString().slice(0, 10) : null,
    fecha_fin: o.fechaFin ? o.fechaFin.toISOString().slice(0, 10) : null,
    return_mode: o.returnMode as ModoRetorno,
    direccion_entrega: o.direccionEntrega,
    zona_id: o.zonaId,
    items: o.items.map((i) => ({
      id: i.id,
      order_id: i.orderId,
      unidad_id: i.unidadId,
      tarifa_aplicada: i.tarifaAplicada,
    })),
  };
}

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: NuevaOrdenInput): Promise<Order> {
    const creado = await this.prisma.order.create({
      data: {
        clienteId: input.clienteId,
        tipo: input.tipo,
        fechaInicio: input.fechaInicio ? new Date(input.fechaInicio) : null,
        fechaFin: input.fechaFin ? new Date(input.fechaFin) : null,
        returnMode: input.returnMode,
        direccionEntrega: input.direccionEntrega,
        zonaId: input.zonaId,
        items: {
          create: input.items.map((item) => ({
            unidadId: item.unidadId,
            tarifaAplicada: item.tarifaAplicada,
          })),
        },
      },
      include: {
        items: true,
      },
    });
    return aDominio(creado);
  }

  async buscarPorId(id: string): Promise<Order | null> {
    const encontrado = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    return encontrado ? aDominio(encontrado) : null;
  }

  async obtenerUnidadesReservadasEnRango(
    modeloId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<string[]> {
    const inicioReq = new Date(fechaInicio);
    const finReq = new Date(fechaFin);

    const ordenesSolapadas = await this.prisma.order.findMany({
      where: {
        tipo: "alquiler",
        estado: { in: ["pendiente_pago", "confirmada", "en_curso"] },
        fechaInicio: { lte: finReq },
        fechaFin: { gte: inicioReq },
        items: {
          some: {
            unidad: { modeloId },
          },
        },
      },
      include: {
        items: true,
      },
    });

    const unidadesIds: string[] = [];
    for (const orden of ordenesSolapadas) {
      for (const item of orden.items) {
        unidadesIds.push(item.unidadId);
      }
    }
    return unidadesIds;
  }

  async obtenerUnidadesConOrdenesActivas(modeloId: string): Promise<string[]> {
    const ordenesActivas = await this.prisma.order.findMany({
      where: {
        estado: { in: ["pendiente_pago", "confirmada", "en_curso"] },
        items: {
          some: {
            unidad: { modeloId },
          },
        },
      },
      include: {
        items: true,
      },
    });

    const unidadesIds: string[] = [];
    for (const orden of ordenesActivas) {
      for (const item of orden.items) {
        unidadesIds.push(item.unidadId);
      }
    }
    return unidadesIds;
  }

  async actualizarEstado(id: string, estado: EstadoOrden): Promise<Order> {
    const actualizado = await this.prisma.order.update({
      where: { id },
      data: { estado },
      include: { items: true },
    });
    return aDominio(actualizado);
  }

  async listarVencidasSinMora(ahora: Date): Promise<Order[]> {
    const encontradas = await this.prisma.order.findMany({
      where: {
        estado: { in: ["confirmada", "en_curso"] },
        fechaFin: { lt: ahora },
      },
      include: { items: true },
    });
    return encontradas.map(aDominio);
  }

  async extenderFecha(id: string, nuevaFechaFin: string): Promise<Order> {
    const actualizado = await this.prisma.order.update({
      where: { id },
      data: { fechaFin: new Date(nuevaFechaFin) },
      include: { items: true },
    });
    return aDominio(actualizado);
  }

  async listarUnidadesEnAlquilerActivo(): Promise<string[]> {
    const ordenesActivas = await this.prisma.order.findMany({
      where: { estado: { in: ["confirmada", "en_curso"] } },
      include: { items: true },
    });

    const unidadesIds: string[] = [];
    for (const orden of ordenesActivas) {
      for (const item of orden.items) {
        unidadesIds.push(item.unidadId);
      }
    }
    return unidadesIds;
  }

  async listarConAtrasoMinimo(diasMinimos: number, ahora: Date): Promise<Order[]> {
    const msPorDia = 1000 * 60 * 60 * 24;
    const umbral = new Date(ahora.getTime() - diasMinimos * msPorDia);
    const encontradas = await this.prisma.order.findMany({
      where: {
        estado: { in: ["confirmada", "en_curso"] },
        fechaFin: { lte: umbral },
      },
      include: { items: true },
    });
    return encontradas.map(aDominio);
  }

  async listarPorCliente(
    clienteId: string,
    filtro: { estado?: EstadoOrden; page: number; pageSize: number },
  ): Promise<{ items: Order[]; total: number }> {
    const where = {
      clienteId,
      ...(filtro.estado ? { estado: filtro.estado } : {}),
    };
    const [total, encontradas] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" as const },
        skip: (filtro.page - 1) * filtro.pageSize,
        take: filtro.pageSize,
        include: { items: true },
      }),
    ]);
    return { items: encontradas.map(aDominio), total };
  }
}
