/**
 * Config del RouteSchedulerJob / Agente 1 (Sprint 7, Issue #22, HU-8.1).
 * Mismo criterio que los `*.config.ts` de `apps/api/src/modules/{modulo}/infrastructure/config/`
 * (`loadWompiCredentials`, `loadWhatsAppCredentials`, etc.): las
 * credenciales/URLs fallan explícito en runtime si faltan (sin fallback
 * silencioso); las reglas de negocio configurables tienen un default
 * razonable documentado.
 */

export interface AnthropicConfig {
  readonly apiKey: string;
  readonly model: string;
}

/** Modelo por defecto: Claude Haiku — decisión explícita del Arquitecto para
 * este sprint (conservar el saldo de USD 7,5 de la cuenta de Anthropic
 * mientras se itera, ver CLAUDE.md §8). Configurable vía `ANTHROPIC_MODEL`
 * para subir de modelo sin tocar código si la calidad del ruteo lo justifica
 * más adelante. */
export const ANTHROPIC_MODEL_DEFAULT = "claude-haiku-4-5";

export function loadAnthropicConfig(env: NodeJS.ProcessEnv = process.env): AnthropicConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY no está definida. RouteSchedulerAgent (Agente 1, implementación real " +
        "contra la API de Anthropic) no puede autenticar sin ella. Definila en el entorno — ver " +
        "apps/workers/.env.example. (Para tests/BDD no hace falta: se usa un mock de " +
        "AnthropicMessagesClient, no la key real.)",
    );
  }
  const model = env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_MODEL_DEFAULT;
  return { apiKey, model };
}

/**
 * URL base de `apps/api` (ej. `https://toolboxjl-api.up.railway.app`, o
 * `http://localhost:3000` en desarrollo local). A diferencia de las reglas de
 * negocio de abajo, no hay un default razonable entre entornos — es config
 * de infraestructura, no una regla de negocio.
 */
export function loadApiBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.API_BASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "API_BASE_URL no está definida. RouteSchedulerJob no sabe contra qué instancia de apps/api " +
        "llamar GET /logistics/pending-orders / POST /logistics/assign-routes. Definila en el " +
        "entorno — ver apps/workers/.env.example.",
    );
  }
  // Sin barra final, para poder concatenar `${apiBaseUrl}/logistics/...` sin dobles barras.
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export interface Agente1ServiceCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Credenciales del usuario de servicio de Supabase Auth
 * (`agente-ruteo@toolboxjl.internal`, `app_metadata.rol = "agente-1"` —
 * decisión ya tomada con el Arquitecto, ver prompt del sprint). Usadas SOLO
 * por `SupabaseAgente1AuthGatewayService` (implementación real) — el fake
 * `InMemoryAgente1AuthGateway` de tests/BDD no las necesita.
 *
 * *** Es probable que estas credenciales NO existan todavía en Supabase ***
 * — si `SupabaseAgente1AuthGatewayService.obtenerAccessToken()` falla con
 * 401/400 al intentar loguearse, ESO es el bloqueo real a reportar al Tech
 * Lead (no se resuelve acá adivinando ni mockeando el fallo silenciosamente
 * — ver el comentario de cabecera de `auth-gateway.ts`).
 */
export function loadAgente1ServiceCredentials(
  env: NodeJS.ProcessEnv = process.env,
): Agente1ServiceCredentials {
  const email = env.AGENTE_1_SERVICE_EMAIL?.trim();
  const password = env.AGENTE_1_SERVICE_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error(
      "AGENTE_1_SERVICE_EMAIL y/o AGENTE_1_SERVICE_PASSWORD no están definidas. " +
        "SupabaseAgente1AuthGatewayService (login real contra Supabase Auth) no puede autenticar " +
        "sin ellas. Definilas en el entorno — ver apps/workers/.env.example.",
    );
  }
  return { email, password };
}

export interface SupabaseRestConfig {
  readonly url: string;
  readonly anonKey: string;
}

/**
 * `SUPABASE_URL` (mismo nombre que ya usa `apps/api`, ver
 * `apps/api/src/modules/auth/infrastructure/config/supabase-auth.config.ts`)
 * + `SUPABASE_ANON_KEY`, necesaria como header `apikey` del endpoint REST de
 * login (`POST {SUPABASE_URL}/auth/v1/token?grant_type=password`) — GoTrue
 * la exige incluso para login con email/password, no solo para operaciones
 * anónimas.
 */
export function loadSupabaseRestConfig(env: NodeJS.ProcessEnv = process.env): SupabaseRestConfig {
  const url = env.SUPABASE_URL?.trim();
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "SUPABASE_URL y/o SUPABASE_ANON_KEY no están definidas. SupabaseAgente1AuthGatewayService " +
        "no puede hacer login REST contra Supabase Auth sin ellas. Definilas en el entorno — ver " +
        "apps/workers/.env.example.",
    );
  }
  return { url: url.endsWith("/") ? url.slice(0, -1) : url, anonKey };
}
