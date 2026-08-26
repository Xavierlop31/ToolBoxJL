import type { TextToSpeechGateway } from "../domain/text-to-speech.gateway";
import { SAMPLE_RATE_PCM } from "../domain/text-to-speech.gateway";

/**
 * Implementación real contra ElevenLabs TTS
 * (`POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`), modelo
 * `eleven_multilingual_v2` (soporta español) — a diferencia del Agente 2
 * (que pide MP3), acá se pide `output_format=pcm_16000` vía query param:
 * PCM crudo, Int16 little-endian, mono, 16kHz — sin header ni códec que
 * decodificar, listo para envolver en un `AudioFrame` de
 * `@livekit/rtc-node` y publicarlo en la sala (ver `../pcm-wav.ts`,
 * `bufferPcmAInt16Array`).
 *
 * *** Nunca ejercitada contra la API real en este entorno de desarrollo ***
 * — mismo criterio documentado en `deepgram-speech-to-text.service.ts`.
 * *** Riesgo ya reportado por el sprint anterior (Agente 2, flag del Tech
 * Lead) ***: `ELEVENLABS_API_KEY` viene fallando con 401 real en CI — no es
 * un bug de este archivo, es un bloqueo de credencial ya conocido.
 */
export class ElevenLabsTextToSpeechService implements TextToSpeechGateway {
  private static readonly BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech";

  constructor(
    private readonly apiKey: string,
    private readonly voiceId: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async sintetizar(texto: string): Promise<Buffer> {
    const url = `${ElevenLabsTextToSpeechService.BASE_URL}/${this.voiceId}?output_format=pcm_${SAMPLE_RATE_PCM}`;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/pcm",
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
