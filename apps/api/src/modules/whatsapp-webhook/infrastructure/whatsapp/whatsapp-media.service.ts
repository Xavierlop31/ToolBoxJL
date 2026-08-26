import { Injectable } from "@nestjs/common";
import type { WhatsAppMediaGateway } from "../../domain/whatsapp-media.gateway";
import { loadWhatsAppCredentials } from "../../../auth-otp/infrastructure/config/whatsapp.config";

/**
 * Implementación real contra WhatsApp Cloud API — reusa
 * `loadWhatsAppCredentials` de AuthOtpModule (mismo `WHATSAPP_TOKEN`/
 * `WHATSAPP_PHONE_NUMBER_ID`, misma WABA, Sprint 6) en vez de declarar una
 * config paralela: es la MISMA cuenta de negocio, solo un caso de uso nuevo
 * (Agente 2) sobre ella.
 *
 * `enviarNotaDeVoz` es un flujo de DOS pasos (documentación pública de Meta
 * para media saliente): 1) `POST /{phone_number_id}/media` (multipart, sube
 * el binario y devuelve un `media id`), 2) `POST /{phone_number_id}/messages`
 * con `type: "audio", audio: { id } }` referenciando ese id — WhatsApp no
 * acepta audio inline en el mensaje.
 *
 * *** Nunca ejercitada contra la API real en este entorno de desarrollo ***
 * — mismo criterio documentado en `deepgram-speech-to-text.service.ts`.
 */
@Injectable()
export class WhatsAppMediaService implements WhatsAppMediaGateway {
  private static readonly BASE_URL = "https://graph.facebook.com/v21.0";

  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor() {
    const credenciales = loadWhatsAppCredentials();
    this.token = credenciales.token;
    this.phoneNumberId = credenciales.phoneNumberId;
  }

  async descargarAudio(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const metaResponse = await fetch(`${WhatsAppMediaService.BASE_URL}/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!metaResponse.ok) {
      throw new Error(
        `WhatsApp Cloud API respondió ${metaResponse.status} al resolver la URL del media "${mediaId}".`,
      );
    }
    const meta = (await metaResponse.json()) as { url?: string; mime_type?: string };
    if (!meta.url) {
      throw new Error(`WhatsApp Cloud API no devolvió una URL descargable para el media "${mediaId}".`);
    }

    const audioResponse = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!audioResponse.ok) {
      throw new Error(`WhatsApp Cloud API respondió ${audioResponse.status} al descargar el media "${mediaId}".`);
    }

    return {
      buffer: Buffer.from(await audioResponse.arrayBuffer()),
      mimeType: meta.mime_type ?? "audio/ogg",
    };
  }

  async enviarTexto(telefono: string, texto: string): Promise<void> {
    await this.enviarMensaje({
      messaging_product: "whatsapp",
      to: telefono,
      type: "text",
      text: { body: texto },
    });
  }

  async enviarNotaDeVoz(telefono: string, audio: Buffer): Promise<void> {
    const mediaId = await this.subirMedia(audio);
    await this.enviarMensaje({
      messaging_product: "whatsapp",
      to: telefono,
      type: "audio",
      audio: { id: mediaId },
    });
  }

  private async subirMedia(audio: Buffer): Promise<string> {
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", "audio/mpeg");
    formData.append("file", new Blob([audio], { type: "audio/mpeg" }), "nota-de-voz.mp3");

    const response = await fetch(`${WhatsAppMediaService.BASE_URL}/${this.phoneNumberId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      body: formData,
    });
    if (!response.ok) {
      const cuerpo = await response.text().catch(() => "<no se pudo leer el cuerpo>");
      throw new Error(`WhatsApp Cloud API respondió ${response.status} al subir la nota de voz. Cuerpo: ${cuerpo}`);
    }
    const data = (await response.json()) as { id?: string };
    if (!data.id) {
      throw new Error("WhatsApp Cloud API no devolvió un media id tras subir la nota de voz.");
    }
    return data.id;
  }

  private async enviarMensaje(body: Record<string, unknown>): Promise<void> {
    const response = await fetch(`${WhatsAppMediaService.BASE_URL}/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const cuerpo = await response.text().catch(() => "<no se pudo leer el cuerpo>");
      throw new Error(`WhatsApp Cloud API respondió ${response.status} al enviar el mensaje. Cuerpo: ${cuerpo}`);
    }
  }
}
