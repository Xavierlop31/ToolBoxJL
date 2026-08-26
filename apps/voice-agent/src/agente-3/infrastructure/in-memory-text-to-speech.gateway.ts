import type { TextToSpeechGateway } from "../domain/text-to-speech.gateway";

/** Fake determinístico para tests/BDD y desarrollo local — nunca llama a la red. Devuelve un Buffer PCM fijo (silencio) y registra los textos sintetizados para aserciones. */
export class InMemoryTextToSpeechGateway implements TextToSpeechGateway {
  readonly textosSintetizados: string[] = [];

  async sintetizar(texto: string): Promise<Buffer> {
    this.textosSintetizados.push(texto);
    // 10 muestras de silencio (Int16) — suficiente para que el código que
    // consume el Buffer (ej. bufferPcmAInt16Array) tenga algo válido que
    // procesar sin depender de la red.
    return Buffer.alloc(20);
  }
}
