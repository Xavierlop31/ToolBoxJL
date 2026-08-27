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

/** Resultado de ejecutar un único `tool_use` — el `tool_result` para devolverle a Claude y, si aplica, el link de pago a ofrecer en la respuesta final. */
interface ResultadoToolUse {
  toolResult: Anthropic.ToolResultBlockParam;
  linkDePago: string | null;
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
  const { resumenTexto, linkDePagoOfrecido } = await ejecutarLoopDeToolCalling(
    deps,
    bearerToken,
    transcripcion,
    maxIteraciones,
    fetchImpl,
  );

  const respuestaTexto = componerRespuestaFinal(resumenTexto, linkDePagoOfrecido);
  logger.log(`Teléfono ${mensaje.telefono}: "${transcripcion}" → "${respuestaTexto}"`);
  await responder(deps, mensaje, respuestaTexto);

  return { transcripcion, respuestaTexto };
}

/**
 * El loop de tool calling propiamente dicho (extraído de `procesarMensajeEntrante`
 * solo para bajar la complejidad cognitiva de esa función — mismo flujo y
 * mismo comportamiento de antes, línea por línea).
 */
async function ejecutarLoopDeToolCalling(
  deps: ProcesarMensajeEntranteDeps,
  bearerToken: string,
  transcripcionInicial: string,
  maxIteraciones: number,
  fetchImpl: typeof fetch,
): Promise<{ resumenTexto: string; linkDePagoOfrecido: string | null }> {
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: transcripcionInicial }];
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

    const { toolResults, linkDePago } = await ejecutarToolUseBlocks(toolUseBlocks, deps, bearerToken, fetchImpl);
    if (linkDePago) {
      // Se adjunta a la respuesta final SIEMPRE, sin depender de que Claude
      // decida mencionarlo en su texto — ver `componerRespuestaFinal()`. Una
      // vez ofrecido, se mantiene aunque una tool call posterior en el mismo
      // mensaje no vuelva a ofrecerlo (mismo criterio que la versión anterior
      // de este loop, no reiniciar a `null`).
      linkDePagoOfrecido = linkDePago;
    }

    messages = [...messages, { role: "user", content: toolResults }];
  }

  return { resumenTexto, linkDePagoOfrecido };
}

/** Ejecuta todos los `tool_use` de una respuesta de Claude y junta sus `tool_result`. */
async function ejecutarToolUseBlocks(
  toolUseBlocks: Anthropic.ToolUseBlock[],
  deps: ProcesarMensajeEntranteDeps,
  bearerToken: string,
  fetchImpl: typeof fetch,
): Promise<{ toolResults: Anthropic.ToolResultBlockParam[]; linkDePago: string | null }> {
  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  let linkDePago: string | null = null;

  for (const toolUse of toolUseBlocks) {
    const resultado = await ejecutarToolUse(toolUse, deps, bearerToken, fetchImpl);
    toolResults.push(resultado.toolResult);
    if (resultado.linkDePago) {
      linkDePago = resultado.linkDePago;
    }
  }

  return { toolResults, linkDePago };
}

/** Despacha un único `tool_use` a su handler (`check_availability`/`extend_rental`), o responde con un error de "tool desconocida". */
async function ejecutarToolUse(
  toolUse: Anthropic.ToolUseBlock,
  deps: ProcesarMensajeEntranteDeps,
  bearerToken: string,
  fetchImpl: typeof fetch,
): Promise<ResultadoToolUse> {
  if (toolUse.name === "check_availability") {
    return { toolResult: await ejecutarCheckAvailability(toolUse, deps, bearerToken, fetchImpl), linkDePago: null };
  }
  if (toolUse.name === "extend_rental") {
    return ejecutarExtendRental(toolUse, deps, bearerToken, fetchImpl);
  }
  return {
    toolResult: {
      type: "tool_result",
      tool_use_id: toolUse.id,
      is_error: true,
      content: `Tool desconocida: "${toolUse.name}".`,
    },
    linkDePago: null,
  };
}

async function ejecutarCheckAvailability(
  toolUse: Anthropic.ToolUseBlock,
  deps: ProcesarMensajeEntranteDeps,
  bearerToken: string,
  fetchImpl: typeof fetch,
): Promise<Anthropic.ToolResultBlockParam> {
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
    return { type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(disponibilidad) };
  } catch (error) {
    return toolResultDeError(toolUse.id, error);
  }
}

async function ejecutarExtendRental(
  toolUse: Anthropic.ToolUseBlock,
  deps: ProcesarMensajeEntranteDeps,
  bearerToken: string,
  fetchImpl: typeof fetch,
): Promise<ResultadoToolUse> {
  const input = toolUse.input as {
    order_id: string;
    nueva_fecha_fin: string;
    modo_cobro?: "link_pago" | "acumular_a_factura_final";
  };
  try {
    const orden = await extenderAlquiler(deps.apiBaseUrl, bearerToken, input, fetchImpl);
    // El link se construye acá (no lo devuelve POST /rentals/extend — ver el
    // gap documentado en ExtenderAlquilerUseCase).
    const linkDePago = input.modo_cobro === "link_pago" ? `${deps.portalBaseUrl}/mis-pedidos/${orden.id}` : null;
    return {
      toolResult: { type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(orden) },
      linkDePago,
    };
  } catch (error) {
    return { toolResult: toolResultDeError(toolUse.id, error), linkDePago: null };
  }
}

function toolResultDeError(toolUseId: string, error: unknown): Anthropic.ToolResultBlockParam {
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    is_error: true,
    content: error instanceof Error ? error.message : String(error),
  };
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
