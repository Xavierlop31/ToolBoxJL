import { Inject, Injectable } from "@nestjs/common";
import { UTILIZATION_REPOSITORY } from "../infrastructure/analytics.tokens";
import type { UtilizationRepository } from "../domain/utilization.repository";
import { mesActualUtc } from "../domain/mes-actual";

/** Forma de la respuesta de `GET /analytics/utilization` (openapi.yaml). */
export interface UtilizacionRespuesta {
  utilizacion_global_pct: number;
  por_modelo: { modelo_id: string; utilizacion_pct: number }[];
}

/** Porcentaje redondeado a 2 decimales; `0` (no `NaN`/`Infinity`) cuando el denominador es 0. */
function porcentaje(numerador: number, denominador: number): number {
  if (denominador <= 0) {
    return 0;
  }
  return Math.round((numerador / denominador) * 10000) / 100;
}

/**
 * `GET /analytics/utilization` (Issue #21, HU-7.3). Fórmula
 * (features/07_kpis_analitica.feature): Utilización = Días Alquilada / Días
 * Disponibles del mes — global (agregando todos los modelos) y por modelo.
 * "del mes" = mes calendario actual en UTC (`mesActualUtc`, ver su
 * doc-comment: `GET /analytics/utilization` no declara un query param
 * `periodo` en openapi.yaml).
 */
@Injectable()
export class ConsultarUtilizacionUseCase {
  constructor(
    @Inject(UTILIZATION_REPOSITORY)
    private readonly utilizacion: UtilizationRepository,
  ) {}

  async ejecutar(ahora: Date = new Date()): Promise<UtilizacionRespuesta> {
    const mes = mesActualUtc(ahora);
    const porModelo = await this.utilizacion.calcularPorModelo(mes);

    let totalAlquilada = 0;
    let totalDisponibles = 0;
    const detalle = porModelo.map((m) => {
      totalAlquilada += m.diasAlquilada;
      totalDisponibles += m.diasDisponibles;
      return {
        modelo_id: m.modeloId,
        utilizacion_pct: porcentaje(m.diasAlquilada, m.diasDisponibles),
      };
    });

    return {
      utilizacion_global_pct: porcentaje(totalAlquilada, totalDisponibles),
      por_modelo: detalle,
    };
  }
}
