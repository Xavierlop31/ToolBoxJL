import type { RangoPeriodo } from "./revenue.repository";

/**
 * Mes calendario actual en UTC, `[desde, hasta)` — usado por
 * `GET /analytics/utilization` y `GET /analytics/delivery-productivity`
 * (Issue #21, HU-7.3), que a diferencia de `GET /analytics/revenue` NO
 * declaran un query param `periodo` en openapi.yaml: el Gherkin de HU-7.3
 * dice explícitamente "del mes" (mes actual), sin pedir un selector.
 * Decisión del Tech Lead documentada acá — mismo criterio de "decisión de
 * implementación que no requiere aprobación previa" que `parsearPeriodo`
 * (HU-7.1, `periodo.ts`).
 *
 * `ahora` es parámetro opcional (mismo criterio que
 * `EjecutarMoraCalculatorUseCase.ejecutar`/`VerMiRutaUseCase.ejecutar`) para
 * que los tests/BDD puedan fijar "hoy" sin depender del reloj real del
 * proceso.
 */
export function mesActualUtc(ahora: Date = new Date()): RangoPeriodo {
  const anio = ahora.getUTCFullYear();
  const mes = ahora.getUTCMonth(); // 0-11
  const desde = new Date(Date.UTC(anio, mes, 1));
  const hasta = new Date(Date.UTC(anio, mes + 1, 1));
  return { desde, hasta };
}

/**
 * Cantidad de días enteros en `[desde, hasta)`. Nunca negativa (si
 * `hasta <= desde`, devuelve 0) — usado para acotar "días disponibles"/"días
 * alquilada" a la intersección real de dos rangos de fecha.
 */
export function diasEnRango(desde: Date, hasta: Date): number {
  return Math.max(0, Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Mes calendario ANTERIOR en UTC, `[desde, hasta)` — hermana de
 * `mesActualUtc` (mismo criterio de límites `[desde, hasta)`, mismo
 * parámetro opcional `ahora` para tests/BDD). Sprint 15 (Issue #153,
 * HU-15.1): `GET /analytics/dashboard-kpis` la usa para calcular
 * `variacion_ingresos_pct` (ingresos del mes calendario actual vs. el mes
 * calendario anterior completo, no "los últimos 30 días").
 */
export function mesAnteriorUtc(ahora: Date = new Date()): RangoPeriodo {
  const anio = ahora.getUTCFullYear();
  const mes = ahora.getUTCMonth(); // 0-11
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1));
  return { desde, hasta };
}
