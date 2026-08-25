/**
 * Recargo logístico por kg (RF-3.2, HU-4.3). Igual criterio que
 * `loadSplitLogisticaPct` (payments/infrastructure/config/wompi.config.ts):
 * es una regla de negocio configurable, no un secreto, por eso tiene un
 * default razonable ($500 COP/kg, el mismo valor que estaba hardcodeado en
 * `PricingCalculatorService` hasta Sprint 4) si la env var no está definida.
 */
export function loadRecargoLogisticoPorKg(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.RECARGO_LOGISTICO_POR_KG_COP?.trim();
  if (!raw) {
    return 500;
  }
  const valor = Number(raw);
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error(
      `RECARGO_LOGISTICO_POR_KG_COP debe ser un entero COP >= 0 (recibido: "${raw}").`,
    );
  }
  return valor;
}
