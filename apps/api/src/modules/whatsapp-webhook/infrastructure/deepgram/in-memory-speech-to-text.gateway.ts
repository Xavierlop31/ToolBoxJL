import { Injectable } from "@nestjs/common";
import type { SpeechToTextGateway } from "../../domain/speech-to-text.gateway";

/** Fake determinístico para tests/BDD — nunca llama a la red. */
@Injectable()
export class InMemorySpeechToTextGateway implements SpeechToTextGateway {
  /** Transcripción fija a devolver — configurable por test. */
  transcripcion = "Quiero extender mi alquiler una semana más.";
  readonly llamadas: { audio: Buffer; mimeType: string }[] = [];

  async transcribir(audio: Buffer, mimeType: string): Promise<string> {
    this.llamadas.push({ audio, mimeType });
    return this.transcripcion;
  }
}
