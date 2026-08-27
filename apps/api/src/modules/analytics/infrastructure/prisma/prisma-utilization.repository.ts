import { Injectable } from "@nestjs/common";
import { EstadoUnidad as PrismaEstadoUnidad } from "@prisma/client";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";
import type { RangoPeriodo } from "../../domain/revenue.repository";
import type { UtilizacionPorModelo, UtilizationRepository } from "../../domain/utilization.repository";
import { diasEnRango } from "../../domain/mes-actual";

/** Estados que representan "unidad no disponible" (ver GAP documentado en `UtilizationRepository`). */
const NO_DISPONIBLE = new Set<PrismaEstadoUnidad>([
  PrismaEstadoUnidad.EnMantenimiento,
  PrismaEstadoUnidad.DadoDeBaja,
]);

/** Estados de `Order` en los que un alquiler cuenta como "efectivamente ocurrido" para el mes (ver doc-comment de `UtilizationRepository`). */
const ESTADOS_ALQUILER_EFECTIVO = ["confirmada", "en_curso", "devuelta", "cerrada"] as const;

@Injectable()
export class PrismaUtilizationRepository implements UtilizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async calcularPorModelo(mes: RangoPeriodo): Promise<UtilizacionPorModelo[]> {
    const porModelo = new Map<string, { diasAlquilada: number; diasDisponibles: number }>();

    const unidades = await this.prisma.toolUnit.findMany({
      select: { modeloId: true, estado: true, fechaIngreso: true },
    });
    for (const unidad of unidades) {
      this.acumularDisponibilidadUnidad(unidad, mes, porModelo);
    }

    const ordenes = await this.prisma.order.findMany({
      where: {
        tipo: "alquiler",
        estado: { in: [...ESTADOS_ALQUILER_EFECTIVO] },
        fechaInicio: { lt: mes.hasta },
        fechaFin: { gt: mes.desde },
      },
      select: {
        fechaInicio: true,
        fechaFin: true,
        items: { select: { unidad: { select: { modeloId: true } } } },
      },
    });
    for (const orden of ordenes) {
      this.acumularAlquilerOrden(orden, mes, porModelo);
    }

    return [...porModelo.entries()].map(([modeloId, v]) => ({ modeloId, ...v }));
  }

  /** Suma los "días disponibles" de una unidad al acumulador del modelo (siempre deja una entrada en el mapa, igual que antes, aunque la unidad no aporte nada). */
  private acumularDisponibilidadUnidad(
    unidad: { modeloId: string; estado: PrismaEstadoUnidad; fechaIngreso: Date },
    mes: RangoPeriodo,
    porModelo: Map<string, { diasAlquilada: number; diasDisponibles: number }>,
  ): void {
    const actual = porModelo.get(unidad.modeloId) ?? { diasAlquilada: 0, diasDisponibles: 0 };
    if (!NO_DISPONIBLE.has(unidad.estado)) {
      const inicioEfectivo = new Date(Math.max(unidad.fechaIngreso.getTime(), mes.desde.getTime()));
      if (inicioEfectivo < mes.hasta) {
        actual.diasDisponibles += diasEnRango(inicioEfectivo, mes.hasta);
      }
    }
    porModelo.set(unidad.modeloId, actual);
  }

  /** Suma los "días alquilada" de una orden al acumulador de cada modelo de sus ítems. */
  private acumularAlquilerOrden(
    orden: {
      fechaInicio: Date | null;
      fechaFin: Date | null;
      items: { unidad: { modeloId: string } }[];
    },
    mes: RangoPeriodo,
    porModelo: Map<string, { diasAlquilada: number; diasDisponibles: number }>,
  ): void {
    if (!orden.fechaInicio || !orden.fechaFin) {
      return;
    }
    const desde = new Date(Math.max(orden.fechaInicio.getTime(), mes.desde.getTime()));
    const hasta = new Date(Math.min(orden.fechaFin.getTime(), mes.hasta.getTime()));
    if (hasta <= desde) {
      return;
    }
    const dias = diasEnRango(desde, hasta);
    for (const item of orden.items) {
      const actual = porModelo.get(item.unidad.modeloId) ?? { diasAlquilada: 0, diasDisponibles: 0 };
      actual.diasAlquilada += dias;
      porModelo.set(item.unidad.modeloId, actual);
    }
  }
}
