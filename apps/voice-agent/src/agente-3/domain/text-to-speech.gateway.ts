/**
 * Puerto de dominio para síntesis de voz (TRD §4.3 — "ElevenLabs TTS").
 *
 * *** Distinto de `TextToSpeechGateway` del Agente 2 a propósito ***: el
 * Agente 2 sintetiza MP3 (formato que WhatsApp Cloud API acepta tal cual
 * para una nota de voz saliente). El Agente 3 necesita publicar el audio
 * como un `AudioFrame` PCM en la sala LiveKit (`@livekit/rtc-node`, ver
 * `../livekit/room-session.ts`) — pedirle a ElevenLabs PCM crudo directo
 * (`output_format=pcm_16000`) evita tener que decodificar un códec MP3 acá
 * (nueva dependencia, más riesgo) solo para volver a convertirlo a PCM.
 */
export interface TextToSpeechGateway {
  /** Devuelve PCM crudo, Int16 little-endian, mono, al sample rate fijo `SAMPLE_RATE_PCM` (ver infra) — listo para envolver en `AudioFrame`/`captureFrame`, sin decodificar ningún códec. */
  sintetizar(texto: string): Promise<Buffer>;
}

/** Sample rate fijo de extremo a extremo del pipeline de audio del Agente 3 (captura del cliente, WAV para Deepgram, y síntesis de ElevenLabs) — ver comentario de cabecera de `../livekit/room-session.ts` sobre por qué se fija un único valor en vez de resamplear entre etapas. */
export const SAMPLE_RATE_PCM = 16000;
