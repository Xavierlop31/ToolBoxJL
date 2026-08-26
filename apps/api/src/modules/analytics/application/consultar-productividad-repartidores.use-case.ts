import { Inject, Injectable } from "@nestjs/common";
import { DELIVERY_PRODUCTIVITY_REPOSITORY } from "../infrastructure/analytics.tokens";
import type { DeliveryProductivityRepository } from "../domain/delivery-productivity.repository";
import { mesActualUtc } from "../domain/mes-actual";

/** Forma de un ítem de la respuesta de `GET /analytics/delivery-productivity` (openapi.yaml). */
export interface ProductividadRespuesta {
  repartidor_id: string;
  entregas_exitosas: number;
  ruta_asignada: number;
  tiempo_promedio_min: number;
}

/**
 * `GET /analytics/delivery-productivity` (Issue #21, HU-7.3). Fórmula
 * (features/07_kpis_analitica.feature): Productividad = Entregas Exitosas /
 * Ruta Asignada, junto con el tiempo promedio por punto — el `roi_pct`/
 * `utilizacion_pct` ya vienen calculados como porcentaje en el response de
 * sus endpoints respectivos, pero `ProductividadRespuesta` (a diferencia de
 * esos) expone los dos componentes crudos (`entregas_exitosas`,
 * `ruta_asignada`) tal como pide el schema de openapi.yaml — el cliente
 * (panel-admin) arma el cociente si lo necesita mostrar como `%`.
 * "del mes" = mes calendario actual en UTC (`mesActualUtc`, mismo criterio
 * que `ConsultarUtilizacionUseCase`).
 */
@Injectable()
export class ConsultarProductividadRepartidoresUseCase {
  constructor(
    @Inject(DELIVERY_PRODUCTIVITY_REPOSITORY)
    private readonly productividad: DeliveryProductivityRepository,
  ) {}

  async ejecutar(ahora: Date = new Date()): Promise<ProductividadRespuesta[]> {
    const mes = mesActualUtc(ahora);
    const datos = await this.productividad.listarPorRepartidor(mes);

    return datos.map((d) => ({
      repartidor_id: d.repartidorId,
      entregas_exitosas: d.entregasExitosas,
      ruta_asignada: d.rutaAsignada,
      // *** GAP DOCUMENTADO (ver domain/delivery-productivity.repository.ts,
      // doc-comment de DeliveryProductivityRepository) ***: no existe en el
      // schema actual ningún timestamp de asignación/entrega por parada, así
      // que no hay dato del que derivar esto — se devuelve 0 explícitamente
      // en vez de inventar un número.
      tiempo_promedio_min: 0,
    }));
  }
}
