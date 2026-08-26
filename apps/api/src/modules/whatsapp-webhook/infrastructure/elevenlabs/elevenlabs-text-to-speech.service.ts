import { Injectable } from "@nestjs/common";
import type { TextToSpeechGateway } from "../../domain/text-to-speech.gateway";
import { loadElevenLabsApiKey, loadElevenLabsVoiceId } from "../config/media-gateway.config";

/**
 * Implementación real contra ElevenLabs TTS
 * (`POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`), modelo
 * `eleven_multilingual_v2` (soporta español) — devuelve MP3 directo en el
 * body de la respuesta (no JSON), lo que WhatsApp Cloud API acepta como
 * media de tipo `audio/mpeg` para una nota de voz saliente.
 *
 * *** Nunca ejercitada contra la API real en este entorno de desarrollo ***
 * — mismo criterio documentado en `deepgram-speech-to-text.service.ts`; la
 * validación real es el workflow de CI de integración.
 */
@Injectable()
export class ElevenLabsTextToSpeechService implements TextToSpeechGateway {
  private static readonly BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech";

  private readonly apiKey: string;
  private readonly voiceId: string;

  constructor() {
    this.apiKey = loadElevenLabsApiKey();
    this.voiceId = loadElevenLabsVoiceId();
  }

  async sintetizar(texto: string): Promise<Buffer> {
    const response = await fetch(`${ElevenLabsTextToSpeechService.BASE_URL}/${this.voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: texto,
        model_id: "eleven_multilingual_v2",
      }),
    });

    if (!response.ok) {
      const cuerpo = await response.text().catch(() => "<no se pudo leer el cuerpo>");
      throw new Error(`ElevenLabs TTS respondió ${response.status}. Cuerpo: ${cuerpo}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
