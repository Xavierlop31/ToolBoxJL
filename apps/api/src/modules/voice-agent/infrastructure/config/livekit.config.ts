export interface LivekitCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly url: string;
}

/**
 * Credenciales de LiveKit (`LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`/
 * `LIVEKIT_URL`) — mismo criterio que `loadWompiCredentials`
 * (payments/infrastructure/config/wompi.config.ts): fallan explícito en
 * runtime si no están, sin fallback silencioso. Según el prompt del Tech
 * Lead, ya están cargadas como secrets de GitHub Actions (scope "Agents").
 */
export function loadLivekitCredentials(
  env: NodeJS.ProcessEnv = process.env,
): LivekitCredentials {
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  const url = env.LIVEKIT_URL?.trim();
  if (!apiKey || !apiSecret || !url) {
    throw new Error(
      "LIVEKIT_API_KEY, LIVEKIT_API_SECRET y/o LIVEKIT_URL no están definidas. " +
        "LivekitAccessTokenIssuerService (implementación real) no puede emitir tokens de sala " +
        "sin ellas. Definilas en el entorno — ver apps/api/.env.example. (Para tests/BDD, usá " +
        "FakeLivekitTokenIssuer en vez de la implementación real — no requiere estas variables.)",
    );
  }
  return { apiKey, apiSecret, url };
}
