/**
 * Credenciales de los gateways de voz del Agente 2 (Deepgram STT, ElevenLabs
 * TTS). Mismo criterio que `loadWhatsAppCredentials`: fallan explícito en
 * runtime si faltan, sin fallback silencioso — y, según el prompt del Tech
 * Lead, YA están cargadas como secrets de GitHub Actions (scope "Agents").
 */
export function loadDeepgramApiKey(env: NodeJS.ProcessEnv = process.env): string {
  const apiKey = env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "DEEPGRAM_API_KEY no está definida. DeepgramSpeechToTextService no puede transcribir notas de " +
        "voz sin ella. Definila en el entorno — ver apps/api/.env.example. (Para tests, se usa " +
        "InMemorySpeechToTextGateway, que no requiere esta variable.)",
    );
  }
  return apiKey;
}

export function loadElevenLabsApiKey(env: NodeJS.ProcessEnv = process.env): string {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY no está definida. ElevenLabsTextToSpeechService no puede sintetizar audio " +
        "sin ella. Definila en el entorno — ver apps/api/.env.example. (Para tests, se usa " +
        "InMemoryTextToSpeechGateway, que no requiere esta variable.)",
    );
  }
  return apiKey;
}

/**
 * Voice ID de ElevenLabs a usar para la síntesis. Regla de negocio/producto
 * configurable, no un secreto — default: "Diego, Bold and Vibrant" (voz de
 * librería en español con acento colombiano, `tN4nkw7MBnGYAwQ71zQp`),
 * confirmado por el Arquitecto. Requiere plan pago de ElevenLabs (Starter+)
 * para usar voces de librería vía API — el plan Free devuelve 402
 * "paid_plan_required" (ver `ElevenLabsTextToSpeechService`). Configurable
 * vía `ELEVENLABS_VOICE_ID` sin tocar código; el modelo
 * `eleven_multilingual_v2` (hardcodeado en el service) soporta español.
 */
export function loadElevenLabsVoiceId(env: NodeJS.ProcessEnv = process.env): string {
  return env.ELEVENLABS_VOICE_ID?.trim() || "tN4nkw7MBnGYAwQ71zQp";
}
