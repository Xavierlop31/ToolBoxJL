export interface WompiCredentials {
  readonly privateKey: string;
  readonly publicKey: string;
}

/**
 * Credenciales de Wompi sandbox. Igual criterio que `loadDatabaseUrl`
 * (catalog-inventory/infrastructure/config/database.config.ts): fallan
 * explícito en runtime si no están, sin fallback silencioso — son
 * credenciales, no una regla de negocio.
 */
export function loadWompiCredentials(
  env: NodeJS.ProcessEnv = process.env,
): WompiCredentials {
  const privateKey = env.WOMPI_PRIVATE_KEY?.trim();
  const publicKey = env.WOMPI_PUBLIC_KEY?.trim();
  if (!privateKey || !publicKey) {
    throw new Error(
      "WOMPI_PRIVATE_KEY y/o WOMPI_PUBLIC_KEY no están definidas. WompiGatewayService " +
        "(implementación real contra Wompi sandbox) no puede autenticar transacciones sin " +
        "ellas. Definilas en el entorno — ver apps/api/.env.example. (Para tests/BDD, usá " +
        "InMemoryWompiGateway en vez de la implementación real — no requiere credenciales.)",
    );
  }
  return { privateKey, publicKey };
}

/**
 * % del recargo logístico que se destina a la cuenta del proveedor
 * logístico en el split simulado (RF-2.4, HU-3.3). A diferencia de las
 * credenciales de Wompi, esta es una regla de negocio configurable, no un
 * secreto — por eso sí tiene un default razonable si la env var no está
 * definida (decisión del Tech Lead para este sprint).
 */
export function loadSplitLogisticaPct(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.WOMPI_SPLIT_LOGISTICA_PCT?.trim();
  if (!raw) {
    return 0.15;
  }
  const valor = Number(raw);
  if (Number.isNaN(valor) || valor < 0 || valor > 1) {
    throw new Error(
      `WOMPI_SPLIT_LOGISTICA_PCT debe ser un número entre 0 y 1 (recibido: "${raw}").`,
    );
  }
  return valor;
}
