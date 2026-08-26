import type { SpeechToTextGateway } from "../domain/speech-to-text.gateway";

/** Fake determinístico para tests/BDD y desarrollo local — nunca llama a la red. Devuelve una transcripción fija configurable, o una cola de transcripciones para simular varios turnos. */
export class InMemorySpeechToTextGateway implements SpeechToTextGateway {
  private cola: string[];
  readonly llamadas: { audio: Buffer; mimeType: string }[] = [];

  constructor(transcripciones: string | string[] = "transcripción de prueba") {
    this.cola = Array.isArray(transcripciones) ? [...transcripciones] : [transcripciones];
  }

  async transcribir(audio: Buffer, mimeType: string): Promise<string> {
    this.llamadas.push({ audio, mimeType });
    return this.cola.length > 1 ? (this.cola.shift() as string) : this.cola[0];
  }
}
