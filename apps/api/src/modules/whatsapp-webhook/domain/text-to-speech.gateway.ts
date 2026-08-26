/**
 * Puerto de síntesis de voz (ElevenLabs TTS, TRD §4.2) — mismo criterio de
 * Clean Architecture que `SpeechToTextGateway`.
 */
export interface TextToSpeechGateway {
  /** Devuelve audio sintetizado (MP3) listo para subir a WhatsApp Cloud API como nota de voz. */
  sintetizar(texto: string): Promise<Buffer>;
}
