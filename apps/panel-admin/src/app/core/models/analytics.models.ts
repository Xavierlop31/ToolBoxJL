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
