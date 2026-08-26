import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { TokenVerifier } from "livekit-server-sdk";
import { ejecutarTurnoAgente3, type AnthropicMessagesClient } from "../../../src/agente-3/voice-turn-agent";
import { mintarTokenDeAgente } from "../../../src/agente-3/livekit/agent-token";
import type { Agente3World } from "../support/world";

/**
 * Step definitions de `features/10_agente_conserje_voz.feature` (@Epica10,
 * Issues #26/#27, HU-10.1/10.2). Corre gratis y rápido en CI: NUNCA llama a
 * la red real ni a una sala LiveKit real — `fetch` y el cliente de Anthropic
 * están mockeados acá mismo. La validación contra las APIs reales
 * (Anthropic/Deepgram/ElevenLabs) es un workflow de CI aparte — ver
 * `.github/workflows/agente-3-voz-integration.yml`.
 *
 * *** LO QUE ESTE ARCHIVO NO PUEDE VALIDAR (documentado, instrucción
 * explícita del prompt de este sprint) ***:
 * - "Se abre una sesión LiveKit en tiempo real": no hay servidor LiveKit
 *   real disponible en CI. Se valida la MITAD que sí controlamos y es
 *   determinística sin red — que el Agente 3 es capaz de mintar un token de
 *   sala válido y firmado (`mintarTokenDeAgente`, verificado acá con
 *   `TokenVerifier` del mismo par de credenciales) — no que efectivamente se
 *   abra una conexión WebRTC.
 * - "La latencia total de la respuesta es menor a 2.5 segundos" (RNF-2): la
 *   latencia medida acá es la del CÓDIGO del Agente 3 con Anthropic/
 *   Deepgram/ElevenLabs mockeados (resuelven casi instantáneo) — sirve para
 *   detectar que el propio pipeline no introduce demoras artificiales
 *   (loops, retries excesivos), pero NO mide la latencia real de red +
 *   inferencia de los tres servicios externos. Esa medición real requiere
 *   RNF-2 en un entorno de staging con las APIs reales (Plan §11, Sprint
 *   11, a cargo de qa-testing con carga real).
 */

const MODELO_FIXTURE = {
  id: "m1",
  nombre: "Taladro Percutor Bosch",
  marca: "Bosch",
  categoria: "percutor",
  tarifa_dia: 15000,
  tarifa_semana: 90000,
};

function textoBlock(text: string): Anthropic.TextBlock {
  return { type: "text", text, citations: null } as Anthropic.TextBlock;
}

function toolUseBlock(id: string, name: string, input: unknown): Anthropic.ToolUseBlock {
  return { type: "tool_use", id, name, input } as Anthropic.ToolUseBlock;
}

function mensajeAssistant(content: Anthropic.ContentBlock[]): Anthropic.Message {
  return {
    id: "msg_bdd",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content,
    stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  } as unknown as Anthropic.Message;
}

Given("que soy un Cliente en el sitio web usando el widget de voz", function (this: Agente3World) {
  // Precondición documental: en el flujo real, el widget del Portal Cliente
  // (frontend-voice-widget, en paralelo) ya abrió la sesión LiveKit y
  // apps/api ya emitió el token con el JWT del cliente embebido en los
  // metadata (ver metadata.ts). Acá el JWT del cliente se fija en el World
  // (this.jwtCliente) sin pasar por LiveKit real — ver el comentario de
  // cabecera de este archivo.
  assert.ok(this.jwtCliente);
});

When(
  "le pido por voz una herramienta y por cuántos días la necesito",
  async function (this: Agente3World) {
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      this.fetchCalls.push({ url, method });
      const path = new URL(url).pathname;
      if (path === "/catalog/search") {
        return { ok: true, status: 200, json: async () => [MODELO_FIXTURE] } as Response;
      }
      if (path === "/inventory/check-availability") {
        return { ok: true, status: 200, json: async () => ({ modelo_id: "m1", unidades_disponibles: 2 }) } as Response;
      }
      throw new Error(`URL inesperada en el step de BDD: ${method} ${path}`);
    }) as unknown as typeof fetch;

    let llamada = 0;
    const anthropic: AnthropicMessagesClient = {
      create: async () => {
        llamada++;
        if (llamada === 1) {
          return mensajeAssistant([toolUseBlock("t1", "search_catalog", { q: "taladro percutor", categoria: "percutor" })]);
        }
        if (llamada === 2) {
          return mensajeAssistant([
            toolUseBlock("t2", "check_availability", { modelo_id: "m1", fecha_inicio: "2026-09-03", fecha_fin: "2026-09-06" }),
          ]);
        }
        return mensajeAssistant([
          textoBlock(
            `Te recomiendo el ${MODELO_FIXTURE.nombre}, tiene unidades disponibles a $${MODELO_FIXTURE.tarifa_dia} por día. ¿Lo querés?`,
          ),
        ]);
      },
    };

    const inicio = Date.now();
    try {
      this.resultado = await ejecutarTurnoAgente3(
        { anthropic, model: "claude-haiku-4-5", apiBaseUrl: "https://api.example.com", jwt: this.jwtCliente, fetchImpl },
        this.mensajesPrevios,
        "Necesito alquilar un taladro percutor para concreto por 3 días desde este jueves.",
      );
      this.mensajesPrevios = this.resultado.mensajes;
    } catch (error) {
      this.error = error as Error;
    }
    this.latenciaMedidaMs = Date.now() - inicio;
  },
);

Then("se abre una sesión LiveKit en tiempo real", async function (this: Agente3World) {
  // Ver el comentario de cabecera: se valida que el Agente 3 puede mintar un
  // token de sala real y válido (criptografía real, sin red) — no que haya
  // una conexión WebRTC efectivamente abierta.
  const roomName = "sala-bdd-test";
  const config = { url: "wss://x.livekit.cloud", apiKey: "apikey-bdd", apiSecret: "apisecret-bdd-suficientemente-largo" };
  const { token } = await mintarTokenDeAgente(config, roomName);
  const claims = await new TokenVerifier(config.apiKey, config.apiSecret).verify(token);
  assert.equal(claims.video?.roomJoin, true);
  assert.equal(claims.video?.room, roomName);
});

Then(
  "el agente interpreta mi solicitud, filtra el catálogo y me recomienda una herramienta idónea",
  function (this: Agente3World) {
    assert.ok(!this.error, `El turno falló inesperadamente: ${this.error?.message}`);
    assert.ok(this.resultado, "No hay resultado del turno para validar");
    assert.ok(
      this.fetchCalls.some((c) => new URL(c.url).pathname === "/catalog/search"),
      "Se esperaba una llamada a GET /catalog/search (search_catalog)",
    );
    assert.ok(
      this.fetchCalls.some((c) => new URL(c.url).pathname === "/inventory/check-availability"),
      "Se esperaba una llamada a GET /inventory/check-availability (check_availability) antes de recomendar",
    );
    assert.match(this.resultado!.respuestaTexto, /Taladro Percutor Bosch/);
  },
);

Then("la latencia total de la respuesta es menor a 2.5 segundos", function (this: Agente3World) {
  assert.ok(this.latenciaMedidaMs !== undefined);
  assert.ok(
    this.latenciaMedidaMs! < 2500,
    `Latencia medida (con dependencias mockeadas): ${this.latenciaMedidaMs}ms — ver el comentario de ` +
      "cabecera de este archivo sobre por qué esto NO es una medición real de RNF-2.",
  );
});

Given("que el Agente 3 me recomendó una herramienta por voz", async function (this: Agente3World) {
  // Reusa el flujo del escenario 1 para dejar mensajesPrevios con una
  // recomendación real (el modelo "m1") — el escenario 2 depende de este
  // contexto conversacional (multi-turno, ver voice-turn-agent.ts).
  const fetchImpl = (async (url: string) => {
    const path = new URL(url).pathname;
    if (path === "/catalog/search") return { ok: true, status: 200, json: async () => [MODELO_FIXTURE] } as Response;
    if (path === "/inventory/check-availability")
      return { ok: true, status: 200, json: async () => ({ modelo_id: "m1", unidades_disponibles: 2 }) } as Response;
    throw new Error(`URL inesperada: ${path}`);
  }) as unknown as typeof fetch;

  let llamada = 0;
  const anthropic: AnthropicMessagesClient = {
    create: async () => {
      llamada++;
      if (llamada === 1) return mensajeAssistant([toolUseBlock("t1", "search_catalog", { q: "taladro percutor" })]);
      if (llamada === 2)
        return mensajeAssistant([
          toolUseBlock("t2", "check_availability", { modelo_id: "m1", fecha_inicio: "2026-09-03", fecha_fin: "2026-09-06" }),
        ]);
      return mensajeAssistant([textoBlock(`Te recomiendo el ${MODELO_FIXTURE.nombre}. ¿Lo querés?`)]);
    },
  };

  const resultado = await ejecutarTurnoAgente3(
    { anthropic, model: "claude-haiku-4-5", apiBaseUrl: "https://api.example.com", jwt: this.jwtCliente, fetchImpl },
    [],
    "Necesito un taladro percutor por 3 días.",
  );
  this.mensajesPrevios = resultado.mensajes;
  this.fetchCalls = []; // se limpia: el escenario 2 solo valida las llamadas de SU propio turno.
});

When("confirmo verbalmente que la quiero", async function (this: Agente3World) {
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    this.fetchCalls.push({ url, method });
    const path = new URL(url).pathname;
    if (path === "/cart/add-item" && method === "POST") {
      const body = JSON.parse(String(init?.body)) as { modelo_id: string; cantidad: number; dias?: number };
      return { ok: true, status: 200, json: async () => ({ items: [body], total: 45000 }) } as Response;
    }
    throw new Error(`URL inesperada en el step de BDD: ${method} ${path}`);
  }) as unknown as typeof fetch;

  let llamada = 0;
  const anthropic: AnthropicMessagesClient = {
    create: async () => {
      llamada++;
      if (llamada === 1) {
        return mensajeAssistant([toolUseBlock("t3", "add_to_cart", { modelo_id: "m1", cantidad: 1, dias: 3 })]);
      }
      return mensajeAssistant([textoBlock(`Listo, agregué el ${MODELO_FIXTURE.nombre} a tu carrito.`)]);
    },
  };

  try {
    this.resultado = await ejecutarTurnoAgente3(
      { anthropic, model: "claude-haiku-4-5", apiBaseUrl: "https://api.example.com", jwt: this.jwtCliente, fetchImpl },
      this.mensajesPrevios,
      "Sí, dale, la quiero.",
    );
    this.mensajesPrevios = this.resultado.mensajes;
  } catch (error) {
    this.error = error as Error;
  }
});

Then(/^el agente invoca POST \/cart\/add-item$/, function (this: Agente3World) {
  assert.ok(!this.error, `El turno falló inesperadamente: ${this.error?.message}`);
  assert.ok(
    this.fetchCalls.some((c) => c.url.endsWith("/cart/add-item") && c.method === "POST"),
    "Se esperaba una llamada POST a /cart/add-item",
  );
  assert.ok(this.resultado?.carritoActualizado, "Se esperaba que el turno devolviera el carrito actualizado");
});

Then("confirma verbalmente que el artículo fue agregado a mi carrito", function (this: Agente3World) {
  assert.ok(this.resultado);
  assert.match(this.resultado!.respuestaTexto, /agregué|agregado/i);
});
