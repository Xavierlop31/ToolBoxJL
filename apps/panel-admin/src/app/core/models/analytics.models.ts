/**
 * Tipo local que refleja el schema de respuesta de `GET /analytics/revenue`
 * (RF de Analítica, Fase 1 — HU-7.1, Issue #19), openapi.yaml líneas
 * 656-680. Mismo criterio que fleet.models.ts/logistics.models.ts:
 * interfaces locales a panel-admin, no shared-types.
 *
 * Los cuatro valores están en COP (pesos colombianos, enteros — sin
 * decimales, según la descripción del schema).
 */
export interface RevenueBreakdown {
  ventas_directas: number;
  tarifas_alquiler: number;
  cobros_mora: number;
  total: number;
}

/**
 * Tipo local que refleja un item de la respuesta de `GET /analytics/roi`
 * (RF de Analítica, Fase 2 — HU-7.2, Issue #20), openapi.yaml líneas
 * 876-900. `roi_pct` ya viene calculado por el backend según
 * (Ingresos Acumulados − Costo de Compra) / Costo de Compra × 100
 * (features/07_kpis_analitica.feature, escenario "Gerente consulta el ROI
 * por herramienta").
 */
export interface RoiItem {
  modelo_id: string;
  roi_pct: number;
}

/**
 * Tipo local que refleja un item de `por_modelo` en la respuesta de
 * `GET /analytics/utilization` (HU-7.3, Issue #21), openapi.yaml líneas
 * 902-926.
 */
export interface UtilizationByModelo {
  modelo_id: string;
  utilizacion_pct: number;
}

/**
 * Tipo local que refleja el schema completo de `GET /analytics/utilization`
 * (HU-7.3, Issue #21), openapi.yaml líneas 902-926. `utilizacion_global_pct`
 * corresponde al criterio "Utilización como Días Alquilada entre Días
 * Disponibles del mes" (features/07_kpis_analitica.feature).
 */
export interface UtilizationSummary {
  utilizacion_global_pct: number;
  por_modelo: UtilizationByModelo[];
}

/**
 * Tipo local que refleja un item de la respuesta de
 * `GET /analytics/delivery-productivity` (HU-7.3, Issue #21), openapi.yaml
 * líneas 928-950. Corresponde al criterio "Productividad como Entregas
 * Exitosas entre Ruta Asignada, junto con el tiempo promedio por punto"
 * (features/07_kpis_analitica.feature).
 */
export interface DeliveryProductivity {
  repartidor_id: string;
  entregas_exitosas: number;
  ruta_asignada: number;
  tiempo_promedio_min: number;
}
