import { Injectable } from "@nestjs/common";
import type { TextToSpeechGateway } from "../../domain/text-to-speech.gateway";

/** Fake determinístico para tests/BDD — nunca llama a la red. */
@Injectable()
export class InMemoryTextToSpeechGateway implements TextToSpeechGateway {
  readonly textosSintetizados: string[] = [];

  async sintetizar(texto: string): Promise<Buffer> {
    this.textosSintetizados.push(texto);
    return Buffer.from(`audio-fake-de:${texto}`);
  }
}
