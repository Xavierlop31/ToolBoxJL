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
      const actual = porModelo.get(unidad.modeloId) ?? { diasAlquilada: 0, diasDisponibles: 0 };
      if (!NO_DISPONIBLE.has(unidad.estado)) {
        const inicioEfectivo = unidad.fechaIngreso > mes.desde ? unidad.fechaIngreso : mes.desde;
        if (inicioEfectivo < mes.hasta) {
          actual.diasDisponibles += diasEnRango(inicioEfectivo, mes.hasta);
        }
      }
      porModelo.set(unidad.modeloId, actual);
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
      if (!orden.fechaInicio || !orden.fechaFin) {
        continue;
      }
      const desde = orden.fechaInicio > mes.desde ? orden.fechaInicio : mes.desde;
      const hasta = orden.fechaFin < mes.hasta ? orden.fechaFin : mes.hasta;
      if (hasta <= desde) {
        continue;
      }
      const dias = diasEnRango(desde, hasta);
      for (const item of orden.items) {
        const actual = porModelo.get(item.unidad.modeloId) ?? { diasAlquilada: 0, diasDisponibles: 0 };
        actual.diasAlquilada += dias;
        porModelo.set(item.unidad.modeloId, actual);
      }
    }

    return [...porModelo.entries()].map(([modeloId, v]) => ({ modeloId, ...v }));
  }
}
