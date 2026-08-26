import { Injectable } from "@nestjs/common";
import type { EstadoUnidad } from "@toolboxjl/shared-types";
import type { RangoPeriodo } from "../../domain/revenue.repository";
import type { UtilizacionPorModelo, UtilizationRepository } from "../../domain/utilization.repository";
import { diasEnRango } from "../../domain/mes-actual";

/** Unidad sembrada directamente por tests/BDD — ver doc-comment de `UtilizationRepository` sobre el criterio de "estado actual como proxy del mes". */
export interface UnidadSembradaParaUtilizacion {
  modeloId: string;
  estado: EstadoUnidad;
  /** Fecha de alta de la unidad, UTC medianoche (mismo criterio que `tool_units.fecha_ingreso`). */
  fechaIngreso: Date;
}

/** Alquiler sembrado — `[fechaInicio, fechaFin)`, límite superior exclusivo (mismo criterio que `RangoPeriodo`). */
export interface AlquilerSembradoParaUtilizacion {
  modeloId: string;
  fechaInicio: Date;
  fechaFin: Date;
}

const NO_DISPONIBLE = new Set<EstadoUnidad>(["En Mantenimiento", "Dado de Baja"]);

@Injectable()
export class InMemoryUtilizationRepository implements UtilizationRepository {
  private readonly unidades: UnidadSembradaParaUtilizacion[] = [];
  private readonly alquileres: AlquilerSembradoParaUtilizacion[] = [];

  sembrarUnidad(unidad: UnidadSembradaParaUtilizacion): void {
    this.unidades.push(unidad);
  }

  sembrarAlquiler(alquiler: AlquilerSembradoParaUtilizacion): void {
    this.alquileres.push(alquiler);
  }

  limpiar(): void {
    this.unidades.length = 0;
    this.alquileres.length = 0;
  }

  async calcularPorModelo(mes: RangoPeriodo): Promise<UtilizacionPorModelo[]> {
    const porModelo = new Map<string, { diasAlquilada: number; diasDisponibles: number }>();

    for (const unidad of this.unidades) {
      const actual = porModelo.get(unidad.modeloId) ?? { diasAlquilada: 0, diasDisponibles: 0 };
      if (!NO_DISPONIBLE.has(unidad.estado)) {
        const inicioEfectivo = unidad.fechaIngreso > mes.desde ? unidad.fechaIngreso : mes.desde;
        if (inicioEfectivo < mes.hasta) {
          actual.diasDisponibles += diasEnRango(inicioEfectivo, mes.hasta);
        }
      }
      porModelo.set(unidad.modeloId, actual);
    }

    for (const alquiler of this.alquileres) {
      const actual = porModelo.get(alquiler.modeloId) ?? { diasAlquilada: 0, diasDisponibles: 0 };
      const desde = alquiler.fechaInicio > mes.desde ? alquiler.fechaInicio : mes.desde;
      const hasta = alquiler.fechaFin < mes.hasta ? alquiler.fechaFin : mes.hasta;
      if (hasta > desde) {
        actual.diasAlquilada += diasEnRango(desde, hasta);
      }
      porModelo.set(alquiler.modeloId, actual);
    }

    return [...porModelo.entries()].map(([modeloId, v]) => ({ modeloId, ...v }));
  }
}
