/**
 * Config del `WhatsAppReminderJob` (Sprint 8, Issue #24, HU-9.1). Mismo
 * criterio que `apps/workers/src/agente-1/config.ts`: credenciales fallan
 * explícito en runtime; reglas de negocio tienen default documentado.
 *
 * A diferencia del flujo entrante (HU-9.2, `apps/api/src/modules/
 * whatsapp-webhook/`), este job NO llama a `apps/api` — consume el MISMO
 * Postgres vía Prisma directo (mismo criterio que `mora-calculator.ts`,
 * ver el comentario de cabecera de `src/main.ts`) y solo necesita
 * credenciales de ElevenLabs (TTS) y WhatsApp Cloud API (envío) — no
 * necesita Deepgram (no transcribe nada) ni un JWT de servicio (no llama
 * ningún endpoint de `apps/api`).
 */

export function loadElevenLabsApiKey(env: NodeJS.ProcessEnv = process.env): string {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY no está definida. WhatsAppReminderJob no puede sintetizar el recordatorio " +
        "de voz sin ella. Definila en el entorno — ver apps/workers/.env.example.",
    );
  }
  return apiKey;
}

/**
 * Voice ID de ElevenLabs — "Diego, Bold and Vibrant" (español, acento
 * colombiano, `tN4nkw7MBnGYAwQ71zQp`), confirmado por el Arquitecto.
 * Configurable vía `ELEVENLABS_VOICE_ID` sin tocar código.
 */
export function loadElevenLabsVoiceId(env: NodeJS.ProcessEnv = process.env): string {
  return env.ELEVENLABS_VOICE_ID?.trim() || "tN4nkw7MBnGYAwQ71zQp";
}

export interface WhatsAppSendCredentials {
  readonly token: string;
  readonly phoneNumberId: string;
}

export function loadWhatsAppSendCredentials(env: NodeJS.ProcessEnv = process.env): WhatsAppSendCredentials {
  const token = env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    throw new Error(
      "WHATSAPP_TOKEN y/o WHATSAPP_PHONE_NUMBER_ID no están definidas. WhatsAppReminderJob no puede " +
        "enviar la nota de voz sin ellas. Definilas en el entorno — ver apps/workers/.env.example.",
    );
  }
  return { token, phoneNumberId };
}
