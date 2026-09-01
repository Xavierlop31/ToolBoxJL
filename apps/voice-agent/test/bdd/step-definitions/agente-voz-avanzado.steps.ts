import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { ejecutarTurnoAgente3, type AnthropicMessagesClient } from "../../../src/agente-3/voice-turn-agent";
import { construirEventoSaludo } from "../../../src/agente-3/livekit/room-session";
import { codificarVoiceAgentEvent, type VoiceAgentEvent } from "../../../src/agente-3/voice-agent-event";
import type { Agente3World } from "../support/world";

/**
 * Step definitions de `features/14_conserje_voz_avanzado.feature` (@Epica14
 * @Fase3, Issues #151/#152, HU-14.1/14.2, Sprint 13). Mismo criterio de
 * `agente-voz.steps.ts` (Sprint 9): corre gratis y rápido en CI, sin red ni
 * sala LiveKit real.
 *
 * *** LO QUE ESTE ARCHIVO NO PUEDE VALIDAR (mismo gap documentado en
 * `agente-voz.steps.ts` para "se abre una sesión LiveKit en tiempo real") ***:
 * - Escenario 1 (HU-14.1): que `manejarSesionDeVoz` efectivamente reproduce
 *   el saludo apenas se conecta la sala LiveKit real — eso depende del SDK
 *   nativo `@livekit/rtc-node` (mockeado manualmente en
 *   `room-session.spec.ts`/`room-session.golden-set.spec.ts`, que SÍ cubren
 *   ese timing exacto vía mocks de Jest, algo que Cucumber no puede hacer
 *   sin repetir ese mismo mock nativo). Este archivo sí ejercita la lógica
 *   de negocio REAL y exportada (`construirEventoSaludo`, el mismo mensaje
 *   `MENSAJE_BIENVENIDA` que usa `room-session.ts`) y el mismo
 *   encode/decode del canal de datos que decodifica el frontend
 *   (`codificarVoiceAgentEvent`).
 * - Escenario 2 (HU-14.2): corre el loop de tool calling REAL
 *   (`ejecutarTurnoAgente3`) con Anthropic/fetch mockeados acá mismo,
 *   capturando los `VoiceAgentEvent` que emite `deps.emitirEvento` — valida
 *   la secuencia running→done de los chips, no la reproducción visual en el
 *   widget (eso es Angular, fuera del alcance de este proceso).
 */

function textoBlock(text: string): Anthropic.TextBlock {
  return { type: "text", text, citations: null } as Anthropic.TextBlock;
}

function toolUseBlock(id: string, name: string, input: unknown): Anthropic.ToolUseBlock {
  return { type: "tool_use", id, name, input } as Anthropic.ToolUseBlock;
}

function mensajeAssistant(content: Anthropic.ContentBlock[]): Anthropic.Message {
  return {
    id: "msg_bdd_avanzado",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content,
    stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

const MODELO_CORTADORA = {
  id: "m-cortadora",
  nombre: "Cortadora de Concreto Husqvarna",
  marca: "Husqvarna",
  categoria: "cortadora",
  tarifa_dia: 45000,
  tarifa_semana: 250000,
};

// --- HU-14.1: saludo proactivo -------------------------------------------

Given(
  /^que hago clic en el botón flotante del Conserje de Voz \("Hablar con Conserje"\)$/,
  function (this: Agente3World) {
    // Precondición documental (mismo criterio que el step análogo de
    // `agente-voz.steps.ts`): en el flujo real esto abre el panel del
    // widget y arranca `LivekitSessionService.connect()` — acá solo se
    // limpia el estado del World para el escenario.
    this.eventosEmitidos = [];
  },
);

When(/^se establece la conexión WebRTC con la sala de LiveKit$/, function (this: Agente3World) {
  // Ejercita la MISMA función exportada que usa `room-session.ts` apenas
  // publica el track del bot (`reproducirSaludoDeBienvenida`) — no una
  // reimplementación del step.
  const eventoSaludo = construirEventoSaludo();
  this.eventosEmitidos.push(eventoSaludo);

  // El canal de datos real viaja como `Uint8Array` (`publishData`) — se
  // valida acá el mismo round-trip de codificación que decodifica
  // `LivekitSessionService` en el frontend (`RoomEvent.DataReceived`).
  const bytes = codificarVoiceAgentEvent(eventoSaludo);
  const decodificado = JSON.parse(new TextDecoder().decode(bytes)) as VoiceAgentEvent;
  assert.deepEqual(decodificado, eventoSaludo);
});

Then(
  /^el agente sintetiza y reproduce inmediatamente un mensaje de bienvenida por audio, sin esperar a que el cliente hable primero$/,
  function (this: Agente3World) {
    assert.equal(this.eventosEmitidos.length, 1, "Se esperaba exactamente un evento de saludo emitido");
    assert.equal(this.eventosEmitidos[0].type, "greeting");
  },
);

Then(/^el texto del saludo aparece en el transcript visual del widget\.$/, function (this: Agente3World) {
  const evento = this.eventosEmitidos[0];
  assert.equal(evento.type, "greeting");
  if (evento.type === "greeting") {
    assert.match(evento.text, /Conserje de Voz de ToolBox JL/);
    assert.ok(evento.text.length > 0, "El texto del saludo no puede estar vacío — es lo que renderiza el transcript");
  }
});

// --- HU-14.2: chips de tool-calling en vivo ------------------------------

Given(/^que le pido al agente: "([^"]+)"$/, function (this: Agente3World, mensaje: string) {
  this.mensajeCliente = mensaje;
});

When(/^el agente procesa el turno y ejecuta las funciones de backend$/, async function (this: Agente3World) {
  assert.ok(this.mensajeCliente, "Falta el paso Given con el pedido del cliente");

  const fetchImpl = (async (url: string) => {
    const path = new URL(url).pathname;
    if (path === "/catalog/search") {
      return { ok: true, status: 200, json: async () => [MODELO_CORTADORA] } as Response;
    }
    if (path === "/inventory/check-availability") {
      return { ok: true, status: 200, json: async () => ({ modelo_id: MODELO_CORTADORA.id, unidades_disponibles: 3 }) } as Response;
    }
    throw new Error(`URL inesperada en el step de BDD: ${path}`);
  }) as unknown as typeof fetch;

  let llamada = 0;
  const anthropic: AnthropicMessagesClient = {
    create: async () => {
      llamada++;
      if (llamada === 1) {
        return mensajeAssistant([toolUseBlock("t1", "search_catalog", { q: "cortadora de concreto" })]);
      }
      if (llamada === 2) {
        return mensajeAssistant([
          toolUseBlock("t2", "check_availability", {
            modelo_id: MODELO_CORTADORA.id,
            fecha_inicio: "2026-09-03",
            fecha_fin: "2026-09-07",
          }),
        ]);
      }
      return mensajeAssistant([
        textoBlock(
          `Tenemos la ${MODELO_CORTADORA.nombre} disponible para Bogotá a $${MODELO_CORTADORA.tarifa_dia} por día. ¿La querés?`,
        ),
      ]);
    },
  };

  this.eventosEmitidos = [];
  try {
    this.resultado = await ejecutarTurnoAgente3(
      {
        anthropic,
        model: "claude-haiku-4-5",
        apiBaseUrl: "https://api.example.com",
        jwt: this.jwtCliente,
        fetchImpl,
        emitirEvento: (evento) => this.eventosEmitidos.push(evento),
      },
      [],
      this.mensajeCliente!,
    );
  } catch (error) {
    this.error = error as Error;
  }
});

Then(
  /^el widget muestra un chip animado con el nombre de la acción en curso \(ej\. "Buscando en catálogo…", "Verificando disponibilidad…", "Agregando al carrito…"\)$/,
  function (this: Agente3World) {
    const chipsEnCurso = this.eventosEmitidos.filter(
      (evento): evento is Extract<VoiceAgentEvent, { type: "tool_status" }> =>
        evento.type === "tool_status" && evento.status === "running",
    );
    assert.ok(
      chipsEnCurso.length >= 2,
      `Se esperaban al menos 2 chips "running" (search_catalog + check_availability), hubo ${chipsEnCurso.length}`,
    );
    const labels = chipsEnCurso.map((chip) => chip.label);
    assert.ok(labels.includes("Buscando en catálogo…"), "Faltó el chip de search_catalog");
    assert.ok(labels.includes("Verificando disponibilidad…"), "Faltó el chip de check_availability");
  },
);

Then(/^al concluir cada llamada, el chip pasa a estado completado$/, function (this: Agente3World) {
  const toolsEnCurso = this.eventosEmitidos
    .filter(
      (evento): evento is Extract<VoiceAgentEvent, { type: "tool_status" }> =>
        evento.type === "tool_status" && evento.status === "running",
    )
    .map((chip) => chip.tool);

  for (const tool of toolsEnCurso) {
    const tieneChipCompletado = this.eventosEmitidos.some(
      (evento) => evento.type === "tool_status" && evento.status === "done" && evento.tool === tool,
    );
    assert.ok(tieneChipCompletado, `Se esperaba que el chip de "${tool}" pasara a estado completado ("done")`);
  }
});

Then(/^el agente responde por voz con los datos exactos\.$/, function (this: Agente3World) {
  assert.ok(!this.error, `El turno falló inesperadamente: ${this.error?.message}`);
  assert.ok(this.resultado, "No hay resultado del turno para validar");
  assert.ok(this.resultado!.respuestaTexto.length > 0, "La respuesta hablada no puede estar vacía");
  assert.match(this.resultado!.respuestaTexto, /Cortadora de Concreto Husqvarna/);
});
