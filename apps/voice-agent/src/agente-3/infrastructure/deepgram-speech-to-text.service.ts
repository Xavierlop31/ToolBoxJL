import type { SpeechToTextGateway } from "../domain/speech-to-text.gateway";

/**
 * Implementación real contra Deepgram STT
 * (`POST https://api.deepgram.com/v1/listen`, audio pre-grabado — mismo
 * endpoint que ya usa el Agente 2, `language=es` fijo, mismo criterio
 * documentado ahí: "los clientes de ToolBox JL son de Colombia").
 *
 * Sin `@Injectable()`/DI de Nest a propósito: este app (`apps/voice-agent`)
 * NO es un proceso NestJS — mismo criterio que `apps/workers`
 * (`SupabaseAgente1AuthGatewayService`), clase plana con la API key inyectada
 * por constructor.
 *
 * *** Nunca ejercitada contra la API real en este entorno de desarrollo ***
 * (mismo criterio documentado para el Agente 2) — la validación real es
 * `.github/workflows/agente-3-voz-integration.yml`.
 */
export class DeepgramSpeechToTextService implements SpeechToTextGateway {
  private static readonly BASE_URL = "https://api.deepgram.com/v1/listen";

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async transcribir(audio: Buffer, mimeType: string): Promise<string> {
    const url = `${DeepgramSpeechToTextService.BASE_URL}?model=nova-2&language=es&smart_format=true`;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": mimeType,
      },
      body: audio,
    });

    if (!response.ok) {
      const cuerpo = await response.text().catch(() => "<no se pudo leer el cuerpo>");
      throw new Error(`Deepgram STT respondió ${response.status}. Cuerpo: ${cuerpo}`);
    }

    const data = (await response.json()) as {
      results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
    };
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    return transcript?.trim() ?? "";
  }
}
