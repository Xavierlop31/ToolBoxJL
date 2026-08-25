import { Inject, Injectable } from "@nestjs/common";
import { parsearPeriodo } from "../domain/periodo";
import { REVENUE_REPOSITORY } from "../infrastructure/analytics.tokens";
import type { RevenueRepository } from "../domain/revenue.repository";

/** Forma de respuesta de `GET /analytics/revenue` (openapi.yaml, montos en COP enteros). */
export interface IngresosDesglosados {
  ventas_directas: number;
  tarifas_alquiler: number;
  cobros_mora: number;
  total: number;
}

/**
 * `GET /analytics/revenue` (Issue #19, HU-7.1, RF de Analítica Fase 1).
 * Fórmula (features/07_kpis_analitica.feature): Ventas Directas + Tarifas
 * de Alquiler + Cobros por Mora. `deposito_garantia` queda deliberadamente
 * fuera de la suma (ver doc-comment de `IngresosPorTipo`).
 */
@Injectable()
export class ConsultarIngresosUseCase {
  constructor(
    @Inject(REVENUE_REPOSITORY)
    private readonly ingresos: RevenueRepository,
  ) {}

  async ejecutar(periodo?: string): Promise<IngresosDesglosados> {
    const rango = parsearPeriodo(periodo);
    const { ventasDirectas, tarifasAlquiler, cobrosMora } = await this.ingresos.sumarPorTipo(rango);
    const total = ventasDirectas.sumar(tarifasAlquiler).sumar(cobrosMora);

    return {
      ventas_directas: ventasDirectas.valor,
      tarifas_alquiler: tarifasAlquiler.valor,
      cobros_mora: cobrosMora.valor,
      total: total.valor,
    };
  }
}
