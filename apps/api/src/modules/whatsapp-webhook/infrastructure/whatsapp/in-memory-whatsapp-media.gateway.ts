import { Injectable } from "@nestjs/common";
import type { WhatsAppMediaGateway } from "../../domain/whatsapp-media.gateway";

/** Fake determinístico para tests/BDD — nunca llama a la red. */
@Injectable()
export class InMemoryWhatsAppMediaGateway implements WhatsAppMediaGateway {
  /** Audio fake a devolver en `descargarAudio` — configurable por test. */
  audioADescargar: { buffer: Buffer; mimeType: string } = {
    buffer: Buffer.from("audio-entrante-fake"),
    mimeType: "audio/ogg",
  };

  readonly textosEnviados: { telefono: string; texto: string }[] = [];
  readonly notasDeVozEnviadas: { telefono: string; audio: Buffer }[] = [];

  async descargarAudio(): Promise<{ buffer: Buffer; mimeType: string }> {
    return this.audioADescargar;
  }

  async enviarTexto(telefono: string, texto: string): Promise<void> {
    this.textosEnviados.push({ telefono, texto });
  }

  async enviarNotaDeVoz(telefono: string, audio: Buffer): Promise<void> {
    this.notasDeVozEnviadas.push({ telefono, audio });
  }
}
