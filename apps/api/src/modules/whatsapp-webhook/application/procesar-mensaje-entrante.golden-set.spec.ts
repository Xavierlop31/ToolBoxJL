import type Anthropic from "@anthropic-ai/sdk";
import { InMemorySpeechToTextGateway } from "../infrastructure/deepgram/in-memory-speech-to-text.gateway";
import { InMemoryTextToSpeechGateway } from "../infrastructure/elevenlabs/in-memory-text-to-speech.gateway";
import { InMemoryWhatsAppMediaGateway } from "../infrastructure/whatsapp/in-memory-whatsapp-media.gateway";
import { InMemoryAgente2AuthGateway } from "../infrastructure/agente-2/auth-gateway";
import type { WebhookInboundMessage } from "../domain/webhook-message";
import {
  procesarMensajeEntrante,
  type AnthropicMessagesClient,
  type ProcesarMensajeEntranteDeps,
} from "./procesar-mensaje-entrante.use-case";

/**
 * Golden set del Agente 2 (TRD §6, Estrategia de Pruebas): conjunto de
 * conversaciones de referencia con aserciones sobre QUÉ TOOL se invoca y con
 * QUÉ PARÁMETROS exactos — no solo sobre el texto de la respuesta final.
 * Complementa a `procesar-mensaje-entrante.use-case.spec.ts` (flujo feliz
 * genérico y ruteo texto/audio) con los escenarios de negocio específicos de
 * la extensión de alquiler (TRD §4.2, HU-9.2).
 *
 * El "LLM" es un mock (`AnthropicMessagesClient.create`) que devuelve, en
 * cada caso, la secuencia de tool_use que un LLM real debería producir para
 * ese guión de conversación — no testeamos que Claude "razone bien" (eso es
 * responsabilidad de Anthropic + el system prompt), sino que el use case
 * (a) le pasa a la tool HTTP correspondiente el input exacto del tool_use, y
 * (b) arma la respuesta final (texto + link de pago) según lo que
 * devolvieron esas tools.
 */

const MODELO_ID = "11111111-1111-1111-1111-111111111111";
const ORDER_ID = "22222222-2222-2222-2222-222222222222";

function mensajeTexto(texto: string): WebhookInboundMessage {
  return {
    telefono: "573001234567",
    waMessageId: "wamid.golden",
    tipo: "text",
    texto,
    audioMediaId: null,
  };
}

function sinToolCalls(texto: string): Anthropic.Message {
  return {
    id: "msg",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content: [{ type: "text", text: texto, citations: [] }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

function toolUse(name: string, input: unknown, id = "tool_1"): Anthropic.Message {
  return {
    id: "msg",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content: [{ type: "tool_use", id, name, input }],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

function fetchMockDe(rutas: Record<string, unknown>): typeof fetch {
  return (async (url: string) => {
    for (const [sufijo, cuerpo] of Object.entries(rutas)) {
      if (url.includes(sufijo)) {
        return { ok: true, status: 200, json: async () => cuerpo } as Response;
      }
    }
    throw new Error(`URL inesperada en el test: ${url}`);
  }) as unknown as typeof fetch;
}

function armarDeps(overrides: Partial<ProcesarMensajeEntranteDeps> = {}): ProcesarMensajeEntranteDeps {
  return {
    anthropic: { create: async () => sinToolCalls("Listo.") },
    model: "claude-haiku-4-5",
    apiBaseUrl: "https://api.example.com/api/v1",
    portalBaseUrl: "https://portal.example.com",
    authGateway: new InMemoryAgente2AuthGateway(),
    speechToText: new InMemorySpeechToTextGateway(),
    textToSpeech: new InMemoryTextToSpeechGateway(),
    whatsapp: new InMemoryWhatsAppMediaGateway(),
    fetchImpl: fetchMockDe({}),
    ...overrides,
  };
}

/** Secuencia de respuestas mock de Claude, una por iteración del loop de tool calling. */
function anthropicConSecuencia(respuestas: Anthropic.Message[]): AnthropicMessagesClient {
  let llamada = 0;
  return {
    create: async () => {
      const respuesta = respuestas[Math.min(llamada, respuestas.length - 1)];
      llamada++;
      return respuesta;
    },
  };
}

describe("Golden set — Agente 2 (WhatsApp, extensión de alquiler)", () => {
  it("1. pide extender con fecha concreta → primer tool call es check_availability con el modelo_id/fechas del contexto, no inventadas", async () => {
    const anthropic: AnthropicMessagesClient = {
      create: async (params) => {
        // El input del tool call debe corresponder a datos presentes en el
        // contexto (mensaje del cliente) — si algún día el modelo "alucina"
        // un modelo_id/fecha que no vino del cliente, este assert lo detecta.
        const contenido = JSON.stringify(params.messages);
        expect(contenido).toContain("orden-1");
        expect(contenido).toContain("2026-09-08");
        return toolUse("check_availability", {
          modelo_id: MODELO_ID,
          fecha_inicio: "2026-09-05",
          fecha_fin: "2026-09-08",
        });
      },
    };
    const fetchImpl = jest.fn(
      fetchMockDe({ "check-availability": { modelo_id: MODELO_ID, unidades_disponibles: 3 } }),
    );
    const deps = armarDeps({ anthropic, fetchImpl: fetchImpl as unknown as typeof fetch });

    await procesarMensajeEntrante(deps, mensajeTexto("Hola, quiero extender mi orden orden-1 hasta el 2026-09-08."));

    const urlLlamada = (fetchImpl.mock.calls[0] as [string])[0];
    expect(urlLlamada).toContain("check-availability");
    expect(urlLlamada).toContain(`modelo_id=${MODELO_ID}`);
    expect(urlLlamada).toContain("fecha_fin=2026-09-08");
  });

  it.each([["link_pago" as const], ["acumular_a_factura_final" as const]])(
    "2. con disponibilidad, el siguiente tool call es extend_rental con order_id/nueva_fecha_fin/modo_cobro=%s",
    async (modoCobro) => {
      const anthropic = anthropicConSecuencia([
        toolUse(
          "check_availability",
          { modelo_id: MODELO_ID, fecha_inicio: "2026-09-05", fecha_fin: "2026-09-08" },
          "tool_1",
        ),
        toolUse("extend_rental", { order_id: ORDER_ID, nueva_fecha_fin: "2026-09-08", modo_cobro: modoCobro }, "tool_2"),
        sinToolCalls("Listo, tu alquiler quedó extendido."),
      ]);
      const fetchImpl = jest.fn(
        fetchMockDe({
          "check-availability": { modelo_id: MODELO_ID, unidades_disponibles: 2 },
          "rentals/extend": { id: ORDER_ID, estado: "confirmada", fecha_fin: "2026-09-08" },
        }),
      );
      const deps = armarDeps({ anthropic, fetchImpl: fetchImpl as unknown as typeof fetch });

      const resultado = await procesarMensajeEntrante(deps, mensajeTexto("Sí, extendéla, confirmo."));

      const llamadaExtend = fetchImpl.mock.calls.find(([url]) => (url as string).includes("rentals/extend"));
      expect(llamadaExtend).toBeDefined();
      const [, init] = llamadaExtend as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({
        order_id: ORDER_ID,
        nueva_fecha_fin: "2026-09-08",
        modo_cobro: modoCobro,
      });

      if (modoCobro === "link_pago") {
        expect(resultado.respuestaTexto).toContain(`https://portal.example.com/mis-pedidos/${ORDER_ID}`);
      } else {
        expect(resultado.respuestaTexto).not.toContain("mis-pedidos");
      }
    },
  );

  it("3. sin unidades disponibles, el agente NO llama extend_rental y el texto final no ofrece link de pago", async () => {
    const anthropic = anthropicConSecuencia([
      toolUse(
        "check_availability",
        { modelo_id: MODELO_ID, fecha_inicio: "2026-09-05", fecha_fin: "2026-09-08" },
        "tool_1",
      ),
      sinToolCalls("Lamentablemente no hay unidades disponibles para esas fechas."),
    ]);
    const fetchImpl = jest.fn(fetchMockDe({ "check-availability": { modelo_id: MODELO_ID, unidades_disponibles: 0 } }));
    const deps = armarDeps({ anthropic, fetchImpl: fetchImpl as unknown as typeof fetch });

    const resultado = await procesarMensajeEntrante(deps, mensajeTexto("Quiero extender mi orden hasta el 2026-09-08."));

    expect(fetchImpl.mock.calls.find(([url]) => (url as string).includes("rentals/extend"))).toBeUndefined();
    expect(resultado.respuestaTexto).toContain("no hay unidades disponibles");
    expect(resultado.respuestaTexto).not.toContain("mis-pedidos");
  });

  it("4. mensaje ambiguo/no relacionado con el dominio → no invoca ninguna tool, responde solo con texto", async () => {
    const anthropic: AnthropicMessagesClient = { create: async () => sinToolCalls("¡Hola! ¿En qué te puedo ayudar hoy?") };
    const fetchImpl = jest.fn(fetchMockDe({}));
    const deps = armarDeps({ anthropic, fetchImpl: fetchImpl as unknown as typeof fetch });

    const resultado = await procesarMensajeEntrante(deps, mensajeTexto("hola, ¿qué tal?"));

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(resultado.respuestaTexto).toBe("¡Hola! ¿En qué te puedo ayudar hoy?");
  });

  it(
    "5. guardrail (TRD §4.2): extend_rental solo se invoca tras confirmación explícita del cliente en el turno — " +
      "*** enforcement HOY es solo de system prompt, no de código ***: este test documenta el comportamiento " +
      "esperado (simulado acá vía el mock del LLM), pero `procesar-mensaje-entrante.use-case.ts` no tiene " +
      "ninguna validación propia que impida invocar extend_rental sin confirmación previa — si el LLM real se " +
      "saltara esa instrucción del prompt, el use case la ejecutaría igual. No hay guard de código para agregar " +
      "en el alcance de este sprint, solo dejar esta limitación documentada.",
    async () => {
      // Turno 1: el cliente solo pregunta disponibilidad, todavía no confirma nada.
      const anthropicSoloPregunta = anthropicConSecuencia([
        toolUse(
          "check_availability",
          { modelo_id: MODELO_ID, fecha_inicio: "2026-09-05", fecha_fin: "2026-09-08" },
          "tool_1",
        ),
        sinToolCalls("Sí, hay disponibilidad. ¿Pagás la diferencia con link de pago o se acumula a tu factura final?"),
      ]);
      const fetchImpl1 = jest.fn(fetchMockDe({ "check-availability": { modelo_id: MODELO_ID, unidades_disponibles: 2 } }));
      const deps1 = armarDeps({ anthropic: anthropicSoloPregunta, fetchImpl: fetchImpl1 as unknown as typeof fetch });

      await procesarMensajeEntrante(deps1, mensajeTexto("¿Puedo extender mi orden hasta el 2026-09-08?"));

      expect(fetchImpl1.mock.calls.find(([url]) => (url as string).includes("rentals/extend"))).toBeUndefined();

      // Turno 2 (mensaje siguiente, ya con confirmación explícita): ahí sí se llama extend_rental.
      const anthropicConfirmado = anthropicConSecuencia([
        toolUse("extend_rental", { order_id: ORDER_ID, nueva_fecha_fin: "2026-09-08", modo_cobro: "link_pago" }, "tool_2"),
        sinToolCalls("Listo, quedó extendida."),
      ]);
      const fetchImpl2 = jest.fn(fetchMockDe({ "rentals/extend": { id: ORDER_ID, estado: "confirmada", fecha_fin: "2026-09-08" } }));
      const deps2 = armarDeps({ anthropic: anthropicConfirmado, fetchImpl: fetchImpl2 as unknown as typeof fetch });

      await procesarMensajeEntrante(deps2, mensajeTexto("Sí, dale, confirmo con link de pago."));

      expect(fetchImpl2.mock.calls.find(([url]) => (url as string).includes("rentals/extend"))).toBeDefined();
    },
  );
});
