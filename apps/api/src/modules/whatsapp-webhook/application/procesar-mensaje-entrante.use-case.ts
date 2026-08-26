import { Logger } from "@nestjs/common";
import type Anthropic from "@anthropic-ai/sdk";
import type { WebhookInboundMessage } from "../domain/webhook-message";
import type { SpeechToTextGateway } from "../domain/speech-to-text.gateway";
import type { TextToSpeechGateway } from "../domain/text-to-speech.gateway";
import type { WhatsAppMediaGateway } from "../domain/whatsapp-media.gateway";
import type { Agente2AuthGateway } from "../infrastructure/agente-2/auth-gateway";
import { AGENTE_2_TOOLS, construirSystemPromptAgente2 } from "../infrastructure/agente-2/tools";
import { consultarDisponibilidad, extenderAlquiler } from "../infrastructure/agente-2/rental-api-client";

/**
 * Cliente mínimo de `@anthropic-ai/sdk` que este archivo necesita — mismo
 * criterio que `apps/workers/src/agente-1/route-scheduler-agent.ts`
 * (`AnthropicMessagesClient`): permite inyectar tanto el cliente real como
 * un mock en tests, sin pagar llamadas reales a la API.
 */
export interface AnthropicMessagesClient {
  create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
}

export interface ProcesarMensajeEntranteDeps {
  anthropic: AnthropicMessagesClient;
  model: string;
  apiBaseUrl: string;
  portalBaseUrl: string;
  authGateway: Agente2AuthGateway;
  speechToText: SpeechToTextGateway;
  textToSpeech: TextToSpeechGateway;
  whatsapp: WhatsAppMediaGateway;
  fetchImpl?: typeof fetch;
  /** Tope de seguridad de iteraciones del loop de tool calling. Default: 6. */
  maxIteraciones?: number;
}

export interface ProcesarMensajeEntranteResultado {
  transcripcion: string;
  respuestaTexto: string;
}

const MENSAJE_SIN_CONTENIDO =
  "No pude entender tu mensaje. ¿Podés escribirme o mandarme una nota de voz contándome qué " +
  "alquiler querés extender y hasta qué fecha?";

/**
 * Orquesta un mensaje entrante de WhatsApp de punta a punta (TRD §4.2,
 * HU-9.2): transcribe (si es nota de voz), corre el loop de tool calling de
 * Claude con `check_availability`/`extend_rental`, y responde por el mismo
 * canal (nota de voz si el cliente mandó audio, texto si mandó texto).
 *
 * Se dispara de forma asíncrona desde `WhatsAppWebhookController` (que ya
 * respondió 200 a Meta antes de llamar esto) — cualquier error acá se loguea
 * pero NUNCA debe re-lanzarse hacia el controller (Meta ya recibió el ack).
 */
export async function procesarMensajeEntrante(
  deps: ProcesarMensajeEntranteDeps,
  mensaje: WebhookInboundMessage,
): Promise<ProcesarMensajeEntranteResultado> {
  const logger = new Logger("ProcesarMensajeEntranteUseCase");
  const fetchImpl = deps.fetchImpl ?? fetch;
  const maxIteraciones = deps.maxIteraciones ?? 6;

  const transcripcion = await transcribir(deps, mensaje);
  if (!transcripcion.trim()) {
    await responder(deps, mensaje, MENSAJE_SIN_CONTENIDO);
    return { transcripcion: "", respuestaTexto: MENSAJE_SIN_CONTENIDO };
  }

  const bearerToken = await deps.authGateway.obtenerAccessToken();

  let messages: Anthropic.MessageParam[] = [{ role: "user", content: transcripcion }];
  let resumenTexto = "";
  let linkDePagoOfrecido: string | null = null;

  for (let iteracion = 0; iteracion < maxIteraciones; iteracion++) {
    const response = await deps.anthropic.create({
      model: deps.model,
      max_tokens: 1024,
      system: construirSystemPromptAgente2(),
      tools: AGENTE_2_TOOLS,
      messages,
    });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    if (textBlocks.length > 0) {
      resumenTexto = textBlocks.map((block) => block.text).join("\n");
    }

    messages = [...messages, { role: "assistant", content: response.content }];

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (toolUseBlocks.length === 0) {
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === "check_availability") {
        const input = toolUse.input as { modelo_id: string; fecha_inicio: string; fecha_fin: string };
        try {
          const disponibilidad = await consultarDisponibilidad(
            deps.apiBaseUrl,
            bearerToken,
            input.modelo_id,
            input.fecha_inicio,
            input.fecha_fin,
            fetchImpl,
          );
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(disponibilidad) });
        } catch (error) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      if (toolUse.name === "extend_rental") {
        const input = toolUse.input as {
          order_id: string;
          nueva_fecha_fin: string;
          modo_cobro?: "link_pago" | "acumular_a_factura_final";
        };
        try {
          const orden = await extenderAlquiler(deps.apiBaseUrl, bearerToken, input, fetchImpl);
          if (input.modo_cobro === "link_pago") {
            // El link se construye acá (no lo devuelve POST /rentals/extend —
            // ver el gap documentado en ExtenderAlquilerUseCase) y se
            // adjunta a la respuesta final SIEMPRE, sin depender de que
            // Claude decida mencionarlo en su texto — ver `responder()`.
            linkDePagoOfrecido = `${deps.portalBaseUrl}/mis-pedidos/${orden.id}`;
          }
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(orden) });
        } catch (error) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        is_error: true,
        content: `Tool desconocida: "${toolUse.name}".`,
      });
    }

    messages = [...messages, { role: "user", content: toolResults }];
  }

  const respuestaTexto = componerRespuestaFinal(resumenTexto, linkDePagoOfrecido);
  logger.log(`Teléfono ${mensaje.telefono}: "${transcripcion}" → "${respuestaTexto}"`);
  await responder(deps, mensaje, respuestaTexto);

  return { transcripcion, respuestaTexto };
}

function componerRespuestaFinal(resumenTexto: string, linkDePago: string | null): string {
  const base = resumenTexto.trim() || "Listo, ya procesé tu solicitud.";
  return linkDePago ? `${base}\n\nPodés pagar la diferencia acá: ${linkDePago}` : base;
}

async function transcribir(deps: ProcesarMensajeEntranteDeps, mensaje: WebhookInboundMessage): Promise<string> {
  if (mensaje.tipo === "text") {
    return mensaje.texto ?? "";
  }
  if (!mensaje.audioMediaId) {
    return "";
  }
  const { buffer, mimeType } = await deps.whatsapp.descargarAudio(mensaje.audioMediaId);
  return deps.speechToText.transcribir(buffer, mimeType);
}

async function responder(
  deps: ProcesarMensajeEntranteDeps,
  mensaje: WebhookInboundMessage,
  texto: string,
): Promise<void> {
  if (mensaje.tipo === "audio") {
    const audio = await deps.textToSpeech.sintetizar(texto);
    await deps.whatsapp.enviarNotaDeVoz(mensaje.telefono, audio);
    return;
  }
  await deps.whatsapp.enviarTexto(mensaje.telefono, texto);
}
