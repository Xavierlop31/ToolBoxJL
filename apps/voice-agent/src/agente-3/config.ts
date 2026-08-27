/**
 * Config del Agente 3 — Conserje Web de Voz (Sprint 9, Issues #26/#27,
 * HU-10.1/10.2, TRD §4.3). Mismo criterio que
 * `apps/workers/src/agente-1/config.ts`/
 * `apps/api/src/modules/whatsapp-webhook/infrastructure/agente-2/config.ts`:
 * credenciales/URLs fallan explícito en runtime si faltan (sin fallback
 * silencioso); las reglas configurables tienen un default documentado.
 *
 * *** Decisión de arquitectura (distinta de Agente 1/2, ya confirmada con el
 * Arquitecto — CLAUDE.md §8, prompt de este sprint) ***: usamos
 * `ANTHROPIC_API_KEY` directamente para este sprint (no Gemini/NVIDIA) — es
 * la cuenta de USD 7,5 compartida entre Agentes 2 y 3 en pruebas. El modelo
 * por defecto es económico (Haiku), igual que Agentes 1/2, configurable sin
 * tocar código.
 */

export interface AnthropicConfig {
  readonly apiKey: string;
  readonly model: string;
}

/** Mismo default que Agentes 1/2 (Claude Haiku) — conserva el saldo compartido de Anthropic (CLAUDE.md §8). */
export const ANTHROPIC_MODEL_DEFAULT = "claude-haiku-4-5";

export function loadAnthropicConfig(env: NodeJS.ProcessEnv = process.env): AnthropicConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY no está definida. El loop de tool calling del Agente 3 (real, contra " +
        "Claude) no puede autenticar sin ella. Definila en el entorno — ver " +
        "apps/voice-agent/.env.example. (Para tests/BDD no hace falta: se usa un mock de " +
        "AnthropicMessagesClient, no la key real.)",
    );
  }
  const model = env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_MODEL_DEFAULT;
  return { apiKey, model };
}

/**
 * URL base de `apps/api` (ej. `https://toolboxjl-api.up.railway.app`, o
 * `http://localhost:3000` en desarrollo local). El Agente 3 llama
 * `GET /catalog/search`, `GET /inventory/check-availability` y
 * `POST /cart/add-item` reenviando el JWT del cliente — nunca con una cuenta
 * de servicio propia (ver `metadata.ts`).
 */
export function loadApiBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.TOOLBOXJL_API_BASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "TOOLBOXJL_API_BASE_URL no está definida. El Agente 3 no sabe contra qué instancia de " +
        "apps/api llamar GET /catalog/search / GET /inventory/check-availability / " +
        "POST /cart/add-item. Definila en el entorno — ver apps/voice-agent/.env.example.",
    );
  }
  // Sin barra final, para poder concatenar `${apiBaseUrl}/cart/add-item` sin dobles barras.
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export interface DeepgramConfig {
  readonly apiKey: string;
}

export function loadDeepgramConfig(env: NodeJS.ProcessEnv = process.env): DeepgramConfig {
  const apiKey = env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "DEEPGRAM_API_KEY no está definida. DeepgramSpeechToTextService (Agente 3) no puede " +
        "autenticar sin ella. Definila en el entorno — ver apps/voice-agent/.env.example. (Para " +
        "tests/BDD no hace falta: se usa InMemorySpeechToTextGateway.)",
    );
  }
  return { apiKey };
}

export interface ElevenLabsConfig {
  readonly apiKey: string;
  readonly voiceId: string;
}

/** Mismo voice_id confirmado por el Arquitecto que usan Agente 2 y el resto del repo — "Diego, Bold and Vibrant" (español, acento colombiano). */
export const ELEVENLABS_VOICE_ID_DEFAULT = "tN4nkw7MBnGYAwQ71zQp";

export function loadElevenLabsConfig(env: NodeJS.ProcessEnv = process.env): ElevenLabsConfig {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY no está definida. ElevenLabsTextToSpeechService (Agente 3) no puede " +
        "autenticar sin ella. Definila en el entorno — ver apps/voice-agent/.env.example. (Para " +
        "tests/BDD no hace falta: se usa InMemoryTextToSpeechGateway.)",
    );
  }
  const voiceId = env.ELEVENLABS_VOICE_ID?.trim() || ELEVENLABS_VOICE_ID_DEFAULT;
  return { apiKey, voiceId };
}

export interface LiveKitConfig {
  readonly url: string;
  readonly apiKey: string;
  readonly apiSecret: string;
}

/**
 * Credenciales del PROYECTO LiveKit (`LIVEKIT_URL` — wss://..., `LIVEKIT_API_KEY`/
 * `LIVEKIT_API_SECRET`) — las MISMAS que usa `apps/api` para emitir el token
 * del cliente en `POST /voice-agent/livekit-token` (ver ese módulo, a cargo
 * del subagente de Backend en paralelo). El Agente 3 las necesita para: (a)
 * mintar su PROPIO token de sala como participante "bot" (`livekit/agent-token.ts`,
 * vía `AccessToken` de `livekit-server-sdk`) y (b) verificar la firma de los
 * webhooks entrantes de LiveKit (`WebhookReceiver`, ver `livekit/webhook-server.ts`).
 */
export function loadLiveKitConfig(env: NodeJS.ProcessEnv = process.env): LiveKitConfig {
  const url = env.LIVEKIT_URL?.trim();
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) {
    throw new Error(
      "LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET no están todas definidas. El Agente 3 " +
        "no puede mintar su propio token de sala ni verificar webhooks de LiveKit sin ellas. " +
        "Definilas en el entorno — ver apps/voice-agent/.env.example.",
    );
  }
  return { url, apiKey, apiSecret };
}

/**
 * Puerto HTTP que este proceso persistente expone para recibir los webhooks
 * de LiveKit (`room_started`/`participant_joined`, ver `livekit/webhook-server.ts`)
 * — es la señal de "sala nueva" que dispara que el Agente 3 se una. Default
 * 8080 (convención de Railway para servicios HTTP persistentes: exponen
 * `PORT`, Railway lo inyecta en runtime). *** Sin este puerto expuesto en la
 * config del servicio Railway, LiveKit no puede entregar los webhooks — es
 * responsabilidad de infraestructura (fuera de este sprint de IA) configurar
 * la URL pública del webhook en el proyecto LiveKit apuntando acá. ***
 */
export function loadPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PORT?.trim();
  const port = raw ? Number.parseInt(raw, 10) : 8080;
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`PORT inválido: "${raw}". Debe ser un entero positivo.`);
  }
  return port;
}
