import type { Dinero } from "@toolboxjl/shared-types";

/**
 * Rango de fechas `[desde, hasta)` — `desde` inclusive, `hasta` exclusivo —
 * usado para filtrar `payments.created_at`. `null` significa "todo el
 * histórico" (sin filtro de periodo).
 */
export interface RangoPeriodo {
  desde: Date;
  hasta: Date;
}

/**
 * Ingresos desglosados por tipo (RF de Analítica, Fase 1, HU-7.1). Cada
 * componente es un `Dinero` — nunca `number` suelto en el dominio (mismo
 * criterio que pricing/payments, ver packages/shared-types/src/dinero.ts).
 * `deposito_garantia` NO forma parte de este desglose a propósito: es un
 * depósito de garantía, no un ingreso (ver fórmula de
 * features/07_kpis_analitica.feature).
 */
export interface IngresosPorTipo {
  ventasDirectas: Dinero;
  tarifasAlquiler: Dinero;
  cobrosMora: Dinero;
}

/**
 * Puerto de repositorio de solo lectura para analítica de ingresos —
 * agrega directamente sobre `payments` (no reutiliza `PaymentRepository`
 * de PaymentsModule: ese repo trabaja con el `Payment` de dominio, que no
 * expone `created_at` — ver `packages/shared-types/src/payment.ts` — y acá
 * se necesita filtrar y agregar por fecha). Mismo patrón dual (Prisma real
 * / in-memory para BDD) que el resto de los módulos.
 */
export interface RevenueRepository {
  /**
   * Suma `payments.monto` por tipo, filtrando `estado = 'capturado'` y,
   * si `rango` no es `null`, `created_at` dentro de `[rango.desde, rango.hasta)`.
   */
  sumarPorTipo(rango: RangoPeriodo | null): Promise<IngresosPorTipo>;
}
