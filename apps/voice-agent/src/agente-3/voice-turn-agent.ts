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

/** Bloques de texto/tool_use de UNA respuesta de Claude, ya separados por tipo — evita repetir los dos `.filter()` en cada punto donde se necesitan. */
interface BloquesDeRespuesta {
  textBlocks: Anthropic.TextBlock[];
  toolUseBlocks: Anthropic.ToolUseBlock[];
}

/** Resultado de despachar UNA tool call: el `tool_result` para devolvérselo a Claude, más — si corresponde a esa tool puntual — el dato de observabilidad/negocio actualizado (`undefined` si esta tool no produce ese dato). */
interface DespachoToolUse {
  toolResult: Anthropic.ToolResultBlockParam;
  ultimaBusqueda?: ToolModelApi[];
  ultimaDisponibilidad?: DisponibilidadApi;
  carritoActualizado?: CartApi;
}

function toolResultDeError(toolUseId: string, error: unknown): Anthropic.ToolResultBlockParam {
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    is_error: true,
    content: error instanceof Error ? error.message : String(error),
  };
}

/** Invoca a Claude con el estado actual de la conversación (system prompt + tools fijas del Agente 3). */
function invocarClaude(deps: Agente3TurnoDeps, messages: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
  return deps.anthropic.create({
    model: deps.model,
    max_tokens: 1024,
    system: construirSystemPromptAgente3(),
    tools: AGENTE_3_TOOLS,
    messages,
  });
}

/** Separa el `content` de una respuesta de Claude en bloques de texto y bloques de tool_use — lo único que este loop necesita distinguir de cada respuesta. */
function separarBloques(response: Anthropic.Message): BloquesDeRespuesta {
  return {
    textBlocks: response.content.filter((block): block is Anthropic.TextBlock => block.type === "text"),
    toolUseBlocks: response.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use"),
  };
}

async function despacharSearchCatalog(
  deps: Agente3TurnoDeps,
  fetchImpl: typeof fetch,
  toolUse: Anthropic.ToolUseBlock,
): Promise<DespachoToolUse> {
  const input = toolUse.input as { q?: string; categoria?: string; fecha_inicio?: string; fecha_fin?: string };
  try {
    const ultimaBusqueda = await buscarCatalogo(deps.apiBaseUrl, deps.jwt, input, fetchImpl);
    return {
      ultimaBusqueda,
      toolResult: { type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(ultimaBusqueda) },
    };
  } catch (error) {
    return { toolResult: toolResultDeError(toolUse.id, error) };
  }
}

async function despacharCheckAvailability(
  deps: Agente3TurnoDeps,
  fetchImpl: typeof fetch,
  toolUse: Anthropic.ToolUseBlock,
): Promise<DespachoToolUse> {
  const input = toolUse.input as { modelo_id: string; fecha_inicio: string; fecha_fin: string };
  try {
    const ultimaDisponibilidad = await consultarDisponibilidad(
      deps.apiBaseUrl,
      deps.jwt,
      input.modelo_id,
      input.fecha_inicio,
      input.fecha_fin,
      fetchImpl,
    );
    return {
      ultimaDisponibilidad,
      toolResult: { type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(ultimaDisponibilidad) },
    };
  } catch (error) {
    return { toolResult: toolResultDeError(toolUse.id, error) };
  }
}

async function despacharAddToCart(
  deps: Agente3TurnoDeps,
  fetchImpl: typeof fetch,
  toolUse: Anthropic.ToolUseBlock,
): Promise<DespachoToolUse> {
  const input = toolUse.input as { modelo_id: string; cantidad: number; dias?: number };
  try {
    const carritoActualizado = await agregarAlCarrito(
      deps.apiBaseUrl,
      deps.jwt,
      { modelo_id: input.modelo_id, cantidad: input.cantidad, dias: input.dias },
      fetchImpl,
    );
    return {
      carritoActualizado,
      toolResult: { type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(carritoActualizado) },
    };
  } catch (error) {
    return { toolResult: toolResultDeError(toolUse.id, error) };
  }
}

/** Despacha UNA tool call a su handler según `toolUse.name` — las tres tools declaradas en `AGENTE_3_TOOLS`, más una respuesta explícita para cualquier otra (no debería pasar, pero evita dejar a Claude esperando un `tool_result` que nunca llega). */
function despacharToolUse(
  deps: Agente3TurnoDeps,
  fetchImpl: typeof fetch,
  toolUse: Anthropic.ToolUseBlock,
): Promise<DespachoToolUse> {
  switch (toolUse.name) {
    case "search_catalog":
      return despacharSearchCatalog(deps, fetchImpl, toolUse);
    case "check_availability":
      return despacharCheckAvailability(deps, fetchImpl, toolUse);
    case "add_to_cart":
      return despacharAddToCart(deps, fetchImpl, toolUse);
    default:
      return Promise.resolve({
        toolResult: {
          type: "tool_result",
          tool_use_id: toolUse.id,
          is_error: true,
          content: `Tool desconocida: "${toolUse.name}".`,
        },
      });
  }
}

/** Estado de negocio/observabilidad acumulado tras despachar TODAS las tool calls de una iteración, más los `tool_result` a devolverle a Claude. */
interface ResultadoToolCalls {
  toolResults: Anthropic.ToolResultBlockParam[];
  ultimaBusqueda: ToolModelApi[] | null;
  ultimaDisponibilidad: DisponibilidadApi | null;
  carritoActualizado: CartApi | null;
}

/** Despacha, en orden, todas las tool calls de una misma respuesta de Claude. Si dos tool calls de la misma iteración tocan el mismo dato (ej. dos `search_catalog`), gana la última — mismo comportamiento que el loop original, que sobrescribía la variable en cada vuelta. */
async function ejecutarToolCalls(
  deps: Agente3TurnoDeps,
  fetchImpl: typeof fetch,
  toolUseBlocks: Anthropic.ToolUseBlock[],
): Promise<ResultadoToolCalls> {
  const resultado: ResultadoToolCalls = {
    toolResults: [],
    ultimaBusqueda: null,
    ultimaDisponibilidad: null,
    carritoActualizado: null,
  };

  for (const toolUse of toolUseBlocks) {
    const despacho = await despacharToolUse(deps, fetchImpl, toolUse);
    resultado.toolResults.push(despacho.toolResult);
    if (despacho.ultimaBusqueda !== undefined) resultado.ultimaBusqueda = despacho.ultimaBusqueda;
    if (despacho.ultimaDisponibilidad !== undefined) resultado.ultimaDisponibilidad = despacho.ultimaDisponibilidad;
    if (despacho.carritoActualizado !== undefined) resultado.carritoActualizado = despacho.carritoActualizado;
  }

  return resultado;
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
 *
 * Descompuesto por fase (invocación a Claude → separación de bloques →
 * despacho de tool calls) en funciones privadas más chicas — mismo criterio
 * de reducción de complejidad cognitiva usado en
 * `apps/workers/src/agente-1/route-scheduler-agent.ts`.
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
    const response = await invocarClaude(deps, messages);
    const { textBlocks, toolUseBlocks } = separarBloques(response);

    if (textBlocks.length > 0) {
      respuestaTexto = textBlocks.map((block) => block.text).join("\n");
    }

    messages = [...messages, { role: "assistant", content: response.content }];

    if (toolUseBlocks.length === 0) {
      // Claude terminó el turno (end_turn) sin más tool calls — cierre normal.
      break;
    }

    const resultadoToolCalls = await ejecutarToolCalls(deps, fetchImpl, toolUseBlocks);
    if (resultadoToolCalls.ultimaBusqueda !== null) ultimaBusqueda = resultadoToolCalls.ultimaBusqueda;
    if (resultadoToolCalls.ultimaDisponibilidad !== null) ultimaDisponibilidad = resultadoToolCalls.ultimaDisponibilidad;
    if (resultadoToolCalls.carritoActualizado !== null) carritoActualizado = resultadoToolCalls.carritoActualizado;

    messages = [...messages, { role: "user", content: resultadoToolCalls.toolResults }];
  }

  return {
    mensajes: messages,
    respuestaTexto: respuestaTexto.trim() || "Perdón, no pude procesar tu pedido. ¿Podés repetirlo?",
    carritoActualizado,
    ultimaBusqueda,
    ultimaDisponibilidad,
  };
}
