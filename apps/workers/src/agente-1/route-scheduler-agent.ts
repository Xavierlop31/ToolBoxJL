import type Anthropic from "@anthropic-ai/sdk";
import { obtenerPedidosPendientes, obtenerVehiculosDisponibles, publicarRutas } from "./logistics-api-client";
import type { RouteApi, RouteInputApi, ShipmentApi } from "./logistics-api-types";
import { AGENTE_1_TOOLS, construirSystemPrompt } from "./tools";

/**
 * Cliente mínimo que este archivo necesita de `@anthropic-ai/sdk` — mismo
 * criterio que las interfaces de dominio de `apps/api`
 * (`WompiGateway`/`WhatsAppOtpGateway`): describe solo el método que se usa,
 * con los tipos del SDK real (`Anthropic.MessageCreateParamsNonStreaming` /
 * `Anthropic.Message`), para poder inyectar tanto el cliente real
 * (`new Anthropic({apiKey}).messages`) como un mock en tests, sin pagar
 * llamadas reales a la API.
 */
export interface AnthropicMessagesClient {
  create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
}

export interface Agente1RunDeps {
  anthropic: AnthropicMessagesClient;
  model: string;
  apiBaseUrl: string;
  bearerToken: string;
  /** Fecha (YYYY-MM-DD) del día de reparto que se está planificando — se le pasa a Claude en el prompt. */
  fechaRuta: string;
  fetchImpl?: typeof fetch;
  /** Tope de seguridad de iteraciones del loop de tool calling. Default: 8. */
  maxIteraciones?: number;
}

export interface Agente1RunResult {
  /** Rutas efectivamente publicadas (respuesta real de POST /logistics/assign-routes). */
  rutasPublicadas: RouteApi[];
  /** Snapshot de los pedidos pendientes que Claude consultó vía get_pending_orders (para que el job calcule el diff de "sin asignar" sin confiar en el texto libre del modelo). */
  pedidosConsultados: ShipmentApi[];
  /** Último bloque de texto de Claude — incluye, por system prompt, el detalle de pedidos sin asignar. Solo para logging/observabilidad, no para lógica de negocio. */
  resumenTexto: string;
}

/** Estado acumulado del loop de tool calling — mismas tres variables que antes vivían sueltas en `ejecutarAgente1`. */
interface EstadoLoopAgente1 {
  pedidosConsultados: ShipmentApi[];
  rutasPublicadas: RouteApi[] | null;
  resumenTexto: string;
}

/** Resultado de ejecutar un único `tool_use` del Agente 1. */
interface ResultadoToolUseAgente1 {
  toolResult: Anthropic.ToolResultBlockParam;
  /** Presente solo si esta tool call fue `get_pending_orders`. */
  pedidosConsultados?: ShipmentApi[];
  /** Presente solo si esta tool call fue `assign_routes` y publicó con éxito. */
  rutasPublicadas?: RouteApi[];
}

/**
 * Corre el loop de tool calling del Agente 1: le da a Claude las dos tools
 * (`get_pending_orders`, `assign_routes`) más la capacidad de la flota como
 * contexto inicial, y ejecuta las tool calls reales contra `apps/api` hasta
 * que `assign_routes` se llama con éxito. Manual loop (no el Tool Runner
 * beta del SDK) a propósito: necesitamos inyectar un mock de
 * `AnthropicMessagesClient` en tests/BDD sin pagar la API real, y un loop
 * manual es más simple de controlar y mockear que la abstracción del tool
 * runner para este caso (dos tools fijas, sin streaming).
 */
export async function ejecutarAgente1(deps: Agente1RunDeps): Promise<Agente1RunResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const maxIteraciones = deps.maxIteraciones ?? 8;

  const vehiculos = await obtenerVehiculosDisponibles(deps.apiBaseUrl, deps.bearerToken, fetchImpl);

  const mensajeInicial: Anthropic.MessageParam = {
    role: "user",
    content:
      `Planificá y publicá las rutas de reparto/recogida del ${deps.fechaRuta}.\n\n` +
      `Vehículos disponibles (flota, con su capacidad y zonas asignadas):\n${JSON.stringify(vehiculos, null, 2)}\n\n` +
      "Usá get_pending_orders para obtener los pedidos pendientes y seguí la estrategia del " +
      "system prompt para decidir la asignación. Terminá con UNA sola llamada a assign_routes.",
  };

  const estado = await ejecutarLoopDeToolCallingAgente1(deps, [mensajeInicial], maxIteraciones, fetchImpl);

  if (estado.rutasPublicadas === null) {
    throw new Error(
      `Agente 1: el batch nocturno terminó sin publicar rutas (assign_routes nunca se completó con ` +
        `éxito) tras ${maxIteraciones} iteración(es). Último texto de Claude: "${estado.resumenTexto}"`,
    );
  }

  return {
    rutasPublicadas: estado.rutasPublicadas,
    pedidosConsultados: estado.pedidosConsultados,
    resumenTexto: estado.resumenTexto,
  };
}

/**
 * El loop de tool calling propiamente dicho (extraído de `ejecutarAgente1`
 * solo para bajar la complejidad cognitiva de esa función — mismo flujo y
 * mismo comportamiento de antes, línea por línea).
 */
async function ejecutarLoopDeToolCallingAgente1(
  deps: Agente1RunDeps,
  mensajesIniciales: Anthropic.MessageParam[],
  maxIteraciones: number,
  fetchImpl: typeof fetch,
): Promise<EstadoLoopAgente1> {
  let messages = mensajesIniciales;
  let pedidosConsultados: ShipmentApi[] = [];
  let rutasPublicadas: RouteApi[] | null = null;
  let resumenTexto = "";

  for (let iteracion = 0; iteracion < maxIteraciones; iteracion++) {
    const response = await deps.anthropic.create({
      model: deps.model,
      max_tokens: 4096,
      system: construirSystemPrompt(),
      tools: AGENTE_1_TOOLS,
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
      // Claude terminó (end_turn) sin más tool calls. Si ya publicó rutas en
      // una iteración previa, esto es el cierre normal del loop. Si no,
      // es un estado inesperado: el system prompt exige terminar con
      // assign_routes — se corta el loop y el chequeo de `ejecutarAgente1` lanza.
      break;
    }

    const resultado = await ejecutarToolUseBlocksAgente1(toolUseBlocks, deps, fetchImpl);
    pedidosConsultados = resultado.pedidosConsultados ?? pedidosConsultados;
    rutasPublicadas = resultado.rutasPublicadas ?? rutasPublicadas;

    messages = [...messages, { role: "user", content: resultado.toolResults }];

    if (rutasPublicadas !== null) {
      break;
    }
  }

  return { pedidosConsultados, rutasPublicadas, resumenTexto };
}

/** Ejecuta todos los `tool_use` de una respuesta de Claude y junta sus `tool_result`. */
async function ejecutarToolUseBlocksAgente1(
  toolUseBlocks: Anthropic.ToolUseBlock[],
  deps: Agente1RunDeps,
  fetchImpl: typeof fetch,
): Promise<{
  toolResults: Anthropic.ToolResultBlockParam[];
  pedidosConsultados?: ShipmentApi[];
  rutasPublicadas?: RouteApi[];
}> {
  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  let pedidosConsultados: ShipmentApi[] | undefined;
  let rutasPublicadas: RouteApi[] | undefined;

  for (const toolUse of toolUseBlocks) {
    const resultado = await ejecutarToolUseAgente1(toolUse, deps, fetchImpl);
    toolResults.push(resultado.toolResult);
    if (resultado.pedidosConsultados) {
      pedidosConsultados = resultado.pedidosConsultados;
    }
    if (resultado.rutasPublicadas) {
      rutasPublicadas = resultado.rutasPublicadas;
    }
  }

  return { toolResults, pedidosConsultados, rutasPublicadas };
}

/** Despacha un único `tool_use` a su handler (`get_pending_orders`/`assign_routes`), o responde con un error de "tool desconocida". */
async function ejecutarToolUseAgente1(
  toolUse: Anthropic.ToolUseBlock,
  deps: Agente1RunDeps,
  fetchImpl: typeof fetch,
): Promise<ResultadoToolUseAgente1> {
  if (toolUse.name === "get_pending_orders") {
    const pedidosConsultados = await obtenerPedidosPendientes(deps.apiBaseUrl, deps.bearerToken, fetchImpl);
    return {
      toolResult: { type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(pedidosConsultados) },
      pedidosConsultados,
    };
  }

  if (toolUse.name === "assign_routes") {
    return ejecutarAssignRoutes(toolUse, deps, fetchImpl);
  }

  // Tool desconocida — no debería pasar (solo declaramos dos), pero se
  // responde explícito en vez de ignorarla silenciosamente, para que
  // Claude no se quede esperando un tool_result que nunca llega.
  return {
    toolResult: {
      type: "tool_result",
      tool_use_id: toolUse.id,
      is_error: true,
      content: `Tool desconocida: "${toolUse.name}".`,
    },
  };
}

async function ejecutarAssignRoutes(
  toolUse: Anthropic.ToolUseBlock,
  deps: Agente1RunDeps,
  fetchImpl: typeof fetch,
): Promise<ResultadoToolUseAgente1> {
  const input = toolUse.input as { rutas: RouteInputApi[] };
  try {
    const rutasPublicadas = await publicarRutas(deps.apiBaseUrl, deps.bearerToken, input.rutas, fetchImpl);
    return {
      toolResult: { type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(rutasPublicadas) },
      rutasPublicadas,
    };
  } catch (error) {
    return {
      toolResult: {
        type: "tool_result",
        tool_use_id: toolUse.id,
        is_error: true,
        content: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
