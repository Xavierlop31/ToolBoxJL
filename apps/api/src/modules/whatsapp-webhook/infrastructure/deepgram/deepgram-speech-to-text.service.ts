import { Injectable } from "@nestjs/common";
import type { SpeechToTextGateway } from "../../domain/speech-to-text.gateway";
import { loadDeepgramApiKey } from "../config/media-gateway.config";

/**
 * Implementación real contra Deepgram STT
 * (`POST https://api.deepgram.com/v1/listen`, audio pre-recorded, no
 * streaming — el TRD no exige streaming para el canal WhatsApp, a diferencia
 * del Agente 3 en LiveKit). `language=es` fijo: los clientes de ToolBox JL
 * son de Colombia (docs/DESIGN.md), no hace falta detección automática de
 * idioma para este sprint.
 *
 * *** Nunca ejercitada contra la API real en este entorno de desarrollo ***
 * (mismo criterio documentado en `whatsapp-otp-gateway.service.ts` para
 * Wompi/WhatsApp) — el shape del request/response sigue la documentación
 * pública de Deepgram, no una corrida real. La validación real es el
 * workflow de CI de integración (ver
 * `.github/workflows/agente-2-whatsapp-integration.yml`).
 */
@Injectable()
export class DeepgramSpeechToTextService implements SpeechToTextGateway {
  private static readonly BASE_URL = "https://api.deepgram.com/v1/listen";

  private readonly apiKey: string;

  constructor() {
    this.apiKey = loadDeepgramApiKey();
  }

  async transcribir(audio: Buffer, mimeType: string): Promise<string> {
    const url = `${DeepgramSpeechToTextService.BASE_URL}?model=nova-2&language=es&smart_format=true`;
    const response = await fetch(url, {
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
