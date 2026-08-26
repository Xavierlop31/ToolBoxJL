import type Anthropic from "@anthropic-ai/sdk";
import { buscarCatalogo, consultarDisponibilidad, type DisponibilidadApi, type ToolModelApi } from "./catalog-api-client";
import { agregarAlCarrito, type CartApi } from "./cart-api-client";
import { AGENTE_3_TOOLS, construirSystemPromptAgente3 } from "./tools";

/**
 * Cliente mínimo de `@anthropic-ai/sdk` que este archivo necesita — mismo
 * criterio que `apps/workers/src/agente-1/route-scheduler-agent.ts` /
 * `apps/api/.../agente-2/procesar-mensaje-entrante.use-case.ts`
 * (`AnthropicMessagesClient`): permite inyectar tanto el cliente real como un
 * mock en tests, sin pagar llamadas reales a la API.
 */
export interface AnthropicMessagesClient {
  create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
}

export interface Agente3TurnoDeps {
  anthropic: AnthropicMessagesClient;
  model: string;
  apiBaseUrl: string;
  /** JWT de Supabase del cliente autenticado, extraído de los metadata de LiveKit (ver `metadata.ts`). */
  jwt: string;
  fetchImpl?: typeof fetch;
  /** Tope de seguridad de iteraciones del loop de tool calling POR TURNO. Default: 6. */
  maxIteraciones?: number;
}

export interface Agente3TurnoResultado {
  /** Historial de mensajes actualizado (assistant + tool_result incluidos) — se le pasa tal cual al próximo turno para mantener contexto conversacional (ej. "el modelo que me recomendaste recién"). */
  mensajes: Anthropic.MessageParam[];
  /** Último bloque de texto de Claude en este turno — lo que se sintetiza por TTS y se reproduce de vuelta en la sala. */
  respuestaTexto: string;
  /** Resultado de POST /cart/add-item si Claude invocó add_to_cart en este turno; `null` si no. */
  carritoActualizado: CartApi | null;
  /** Último resultado de search_catalog en este turno (observabilidad/tests — no se usa para lógica de negocio, el modelo ya lo recibió como tool_result). */
  ultimaBusqueda: ToolModelApi[] | null;
  /** Último resultado de check_availability en este turno. */
  ultimaDisponibilidad: DisponibilidadApi | null;
}

/**
 * Corre el loop de tool calling del Agente 3 para UN turno de conversación
 * (una transcripción de usuario → una respuesta hablada). A diferencia de
 * Agentes 1/2 (una sola invocación, sin estado entre llamadas), el Agente 3
 * es conversacional multi-turno (escenario 2 del feature depende del
 * contexto del escenario 1 — "el Agente 3 me recomendó una herramienta" →
 * "confirmo verbalmente que la quiero"): el llamador pasa `mensajesPrevios`
 * (vacío en el primer turno de la sesión) y recibe `mensajes` actualizado
 * para pasarlo al próximo turno — el estado de la conversación vive fuera de
 * esta función (en `livekit/room-session.ts`, uno por sala activa).
 *
 * Manual loop (no el Tool Runner beta del SDK), mismo criterio documentado
 * en Agente 1/2: hace falta poder inyectar un mock de
 * `AnthropicMessagesClient` en tests/BDD sin pagar la API real.
 */
export async function ejecutarTurnoAgente3(
  deps: Agente3TurnoDeps,
  mensajesPrevios: Anthropic.MessageParam[],
  transcripcionUsuario: string,
): Promise<Agente3TurnoResultado> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const maxIteraciones = deps.maxIteraciones ?? 6;

  let messages: Anthropic.MessageParam[] = [...mensajesPrevios, { role: "user", content: transcripcionUsuario }];

  let respuestaTexto = "";
  let carritoActualizado: CartApi | null = null;
  let ultimaBusqueda: ToolModelApi[] | null = null;
  let ultimaDisponibilidad: DisponibilidadApi | null = null;

  for (let iteracion = 0; iteracion < maxIteraciones; iteracion++) {
    const response = await deps.anthropic.create({
      model: deps.model,
      max_tokens: 1024,
      system: construirSystemPromptAgente3(),
      tools: AGENTE_3_TOOLS,
      messages,
    });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    if (textBlocks.length > 0) {
      respuestaTexto = textBlocks.map((block) => block.text).join("\n");
    }

    messages = [...messages, { role: "assistant", content: response.content }];

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (toolUseBlocks.length === 0) {
      // Claude terminó el turno (end_turn) sin más tool calls — cierre normal.
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      if (toolUse.name === "search_catalog") {
        const input = toolUse.input as { q?: string; categoria?: string; fecha_inicio?: string; fecha_fin?: string };
        try {
          ultimaBusqueda = await buscarCatalogo(deps.apiBaseUrl, deps.jwt, input, fetchImpl);
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(ultimaBusqueda) });
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

      if (toolUse.name === "check_availability") {
        const input = toolUse.input as { modelo_id: string; fecha_inicio: string; fecha_fin: string };
        try {
          ultimaDisponibilidad = await consultarDisponibilidad(
            deps.apiBaseUrl,
            deps.jwt,
            input.modelo_id,
            input.fecha_inicio,
            input.fecha_fin,
            fetchImpl,
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(ultimaDisponibilidad),
          });
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

      if (toolUse.name === "add_to_cart") {
        const input = toolUse.input as { modelo_id: string; cantidad: number; dias?: number };
        try {
          carritoActualizado = await agregarAlCarrito(
            deps.apiBaseUrl,
            deps.jwt,
            { modelo_id: input.modelo_id, cantidad: input.cantidad, dias: input.dias },
            fetchImpl,
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(carritoActualizado),
          });
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

      // Tool desconocida — no debería pasar (solo declaramos tres), pero se
      // responde explícito en vez de ignorarla silenciosamente, para que
      // Claude no se quede esperando un tool_result que nunca llega.
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        is_error: true,
        content: `Tool desconocida: "${toolUse.name}".`,
      });
    }

    messages = [...messages, { role: "user", content: toolResults }];
  }

  return {
    mensajes: messages,
    respuestaTexto: respuestaTexto.trim() || "Perdón, no pude procesar tu pedido. ¿Podés repetirlo?",
    carritoActualizado,
    ultimaBusqueda,
    ultimaDisponibilidad,
  };
}
