import { Inject, Injectable } from "@nestjs/common";
import { ROI_REPOSITORY } from "../infrastructure/analytics.tokens";
import type { RoiRepository } from "../domain/roi.repository";

/** Forma de un ítem de la respuesta de `GET /analytics/roi` (openapi.yaml). */
export interface RoiPorModelo {
  modelo_id: string;
  roi_pct: number;
}

/**
 * `GET /analytics/roi` (Issue #20, HU-7.2). Fórmula
 * (features/07_kpis_analitica.feature, escenario "Gerente consulta el ROI
 * por herramienta"): (Ingresos Acumulados − Costo de Compra) / Costo de
 * Compra × 100, por modelo.
 *
 * *** GAP DOCUMENTADO ***: los modelos cuyo `costo_compra` es `null` o `0`
 * (campo opcional en `ToolModelInput`, openapi.yaml) quedan EXCLUIDOS de la
 * respuesta — dividir por un costo de compra desconocido/cero no produce un
 * ROI matemáticamente válido, y devolver `0`/`null`/`Infinity` en su lugar
 * sería inventar un dato que el negocio nunca cargó. Es responsabilidad de
 * quien mantiene el catálogo completar `costo_compra` (`POST/PATCH
 * /inventory/models`, RF-1.1) para que ese modelo aparezca en este reporte.
 */
@Injectable()
export class ConsultarRoiUseCase {
  constructor(
    @Inject(ROI_REPOSITORY)
    private readonly roi: RoiRepository,
  ) {}

  async ejecutar(modeloId?: string): Promise<RoiPorModelo[]> {
    const modelos = await this.roi.listarConIngresos(modeloId);

    return modelos
      .filter((m) => m.costoCompra !== null && m.costoCompra.valor > 0)
      .map((m) => {
        const costo = m.costoCompra!.valor;
        const roiPct = ((m.ingresosAcumulados.valor - costo) / costo) * 100;
        return {
          modelo_id: m.modeloId,
          roi_pct: Math.round(roiPct * 100) / 100,
        };
      });
  }
}
