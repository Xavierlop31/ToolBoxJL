/**
 * Config del loop de tool calling del Agente 2 (Sprint 8, Issue #25, HU-9.2).
 * Mismo criterio que `apps/workers/src/agente-1/config.ts`: credenciales
 * fallan explícito en runtime si faltan; reglas configurables tienen default.
 *
 * *** Decisión de arquitectura documentada (distinta del Agente 1) ***: el
 * Agente 1 corre en `apps/workers`, un proceso SEPARADO de `apps/api`, así
 * que necesita llamar a `apps/api` por HTTP externo con un JWT de servicio.
 * El Agente 2 (esta implementación) corre DENTRO del mismo proceso de
 * `apps/api` — el disparador es su propio webhook (`POST /webhooks/whatsapp`,
 * que ya vive en `apps/api`), no un cron externo. Aun así, el loop de tool
 * calling llama a `GET /inventory/check-availability`/`POST /rentals/extend`
 * por HTTP REAL (loopback a sí mismo), autenticado con un JWT de servicio
 * `agente-2` obtenido vía `SupabaseAgente2AuthGatewayService` — igual patrón
 * que el Agente 1 ("mismo patrón que el Agente 1", instrucción explícita del
 * Tech Lead) — en vez de invocar los use cases de Nest directamente por DI.
 * Se eligió HTTP real (loopback) en vez de invocación in-process para que
 * las tool calls declaradas en el contrato (`x-roles: [..., agente-2]`,
 * TRD §4.2) sean demostrables como llamadas HTTP reales, auditable con
 * cualquier proxy/log de red, igual que si el Agente 2 corriera en un
 * proceso separado — más fiel al contrato, a costa de un salto de loopback
 * que un demo local paga en milisegundos. Flag explícito para el
 * Arquitecto: esto reemplaza la sugerencia original de ubicar toda la
 * orquestación en `apps/workers/src/agente-2/` (ver PR de este sprint para
 * el detalle completo de la decisión y su razonamiento).
 */

export interface AnthropicConfig {
  readonly apiKey: string;
  readonly model: string;
}

/** Mismo default que el Agente 1 (Claude Haiku, CLAUDE.md §8) — conserva el saldo compartido de Anthropic. */
export const ANTHROPIC_MODEL_DEFAULT = "claude-haiku-4-5";

export function loadAnthropicConfig(env: NodeJS.ProcessEnv = process.env): AnthropicConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY no está definida. ProcesarMensajeEntranteUseCase (Agente 2, tool calling " +
        "real contra Claude) no puede autenticar sin ella. Definila en el entorno — ver " +
        "apps/api/.env.example. (Para tests/BDD no hace falta: se usa un mock de cliente Anthropic.)",
    );
  }
  const model = env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_MODEL_DEFAULT;
  return { apiKey, model };
}

export interface Agente2ServiceCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Credenciales del usuario de servicio de Supabase Auth
 * (`agente-whatsapp@toolboxjl.internal`, `app_metadata.rol = "agente-2"`).
 * *** Es probable que este usuario NO exista todavía en Supabase Auth ***
 * (mismo bloqueo documentado para `agente-1`/`AGENTE_1_SERVICE_EMAIL` en
 * Sprint 7) — si el login falla, es un bloqueo real a reportar, no algo para
 * resolver inventando credenciales. Ver `auth-gateway.ts`.
 */
export function loadAgente2ServiceCredentials(
  env: NodeJS.ProcessEnv = process.env,
): Agente2ServiceCredentials {
  const email = env.AGENTE_2_SERVICE_EMAIL?.trim();
  const password = env.AGENTE_2_SERVICE_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error(
      "AGENTE_2_SERVICE_EMAIL y/o AGENTE_2_SERVICE_PASSWORD no están definidas. " +
        "SupabaseAgente2AuthGatewayService no puede autenticar sin ellas. Definilas en el entorno — " +
        "ver apps/api/.env.example.",
    );
  }
  return { email, password };
}

export interface SupabaseRestConfig {
  readonly url: string;
  readonly anonKey: string;
}

/**
 * `SUPABASE_URL` (ya definida en apps/api para AuthModule) + `SUPABASE_ANON_KEY`
 * (NUEVA para apps/api — GoTrue la exige como header `apikey` del login REST,
 * mismo criterio que `apps/workers/src/agente-1/config.ts`).
 */
export function loadSupabaseRestConfig(env: NodeJS.ProcessEnv = process.env): SupabaseRestConfig {
  const url = env.SUPABASE_URL?.trim();
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "SUPABASE_URL y/o SUPABASE_ANON_KEY no están definidas. SupabaseAgente2AuthGatewayService no " +
        "puede hacer login REST contra Supabase Auth sin ellas. Definilas en el entorno — ver " +
        "apps/api/.env.example.",
    );
  }
  return { url: url.endsWith("/") ? url.slice(0, -1) : url, anonKey };
}

/**
 * Base URL contra la que el loop de tool calling llama
 * `GET /inventory/check-availability`/`POST /rentals/extend` — por defecto,
 * loopback a SÍ MISMO (`apps/api`, mismo proceso que recibe el webhook), vía
 * `http://localhost:${PORT}/api/v1`. Overrideable con `AGENTE_2_API_BASE_URL`
 * si en algún entorno hiciera falta apuntar a otra instancia.
 */
export function loadAgente2ApiBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicito = env.AGENTE_2_API_BASE_URL?.trim();
  if (explicito) {
    return explicito.endsWith("/") ? explicito.slice(0, -1) : explicito;
  }
  const port = env.PORT?.trim() || "3000";
  return `http://localhost:${port}/api/v1`;
}

/**
 * URL pública de `apps/portal-cliente` — usada SOLO para construir el link
 * de pago que el Agente 2 ofrece por WhatsApp cuando el cliente elige
 * `modo_cobro: "link_pago"` (TRD §4.2). *** Decisión de alcance documentada
 * (instrucción explícita del Tech Lead) ***: no se construye un endpoint
 * nuevo de "generar link de pago" — se reusa el checkout Wompi que
 * `apps/portal-cliente` ya tiene desde Sprint 3
 * (`POST /orders/{id}/pay`, ver `PaymentsController`). Este link es un
 * best-effort: apunta a `${PORTAL_BASE_URL}/mis-pedidos/{order_id}`, una
 * ruta que ASUME que el portal tiene (o va a tener) una pantalla de detalle
 * de pedido con acción de pago — no se verificó contra el router real de
 * `apps/portal-cliente` (fuera de alcance de este sprint de IA, que no
 * incluye trabajo de frontend). Si esa ruta no existe todavía, es un gap de
 * frontend a resolver por quien tenga esa pantalla, no un bloqueo de este
 * sprint.
 */
export function loadPortalBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.PORTAL_BASE_URL?.trim() || "http://localhost:4201";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}
