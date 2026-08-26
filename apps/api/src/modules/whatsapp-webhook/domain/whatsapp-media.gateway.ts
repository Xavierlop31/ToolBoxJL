/**
 * Puerto de mensajería/media de WhatsApp Cloud API para el Agente 2 —
 * DISTINTO de `WhatsAppOtpGateway` (AuthOtpModule, solo manda `enviarOtp`):
 * este necesita descargar audio entrante y mandar tanto texto como notas de
 * voz salientes. Mismo criterio de Clean Architecture (dominio declara,
 * `infrastructure/whatsapp` implementa real/fake).
 */
export interface WhatsAppMediaGateway {
  /** Descarga el binario de una nota de voz entrante a partir de su `media id` (dos pasos: resolver URL firmada + descargar). */
  descargarAudio(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }>;
  enviarTexto(telefono: string, texto: string): Promise<void>;
  /** Sube `audio` (MP3) como media y lo envía como nota de voz al `telefono`. */
  enviarNotaDeVoz(telefono: string, audio: Buffer): Promise<void>;
}
