/**
 * Puerto de transcripción de voz (Deepgram STT, TRD §4.2) — mismo criterio
 * de Clean Architecture que `WhatsAppOtpGateway`: el dominio declara la
 * interfaz, `infrastructure/deepgram` la implementa dos veces (real / fake
 * determinístico para tests).
 */
export interface SpeechToTextGateway {
  /** `audio`: bytes crudos de la nota de voz (formato OGG/Opus, tal como los entrega WhatsApp Cloud API). */
  transcribir(audio: Buffer, mimeType: string): Promise<string>;
}
