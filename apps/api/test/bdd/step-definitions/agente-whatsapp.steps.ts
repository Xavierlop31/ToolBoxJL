import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import {
  procesarMensajeEntrante,
  type AnthropicMessagesClient,
  type ProcesarMensajeEntranteDeps,
} from "../../../src/modules/whatsapp-webhook/application/procesar-mensaje-entrante.use-case";
import type { WebhookInboundMessage } from "../../../src/modules/whatsapp-webhook/domain/webhook-message";
import { InMemorySpeechToTextGateway } from "../../../src/modules/whatsapp-webhook/infrastructure/deepgram/in-memory-speech-to-text.gateway";
import { InMemoryTextToSpeechGateway } from "../../../src/modules/whatsapp-webhook/infrastructure/elevenlabs/in-memory-text-to-speech.gateway";
import { InMemoryWhatsAppMediaGateway } from "../../../src/modules/whatsapp-webhook/infrastructure/whatsapp/in-memory-whatsapp-media.gateway";
import { InMemoryAgente2AuthGateway } from "../../../src/modules/whatsapp-webhook/infrastructure/agente-2/auth-gateway";
import type { ToolboxWorld } from "../support/world";

/**
 * Step definitions del escenario "Cliente extiende su alquiler por voz a
 * través del Agente 2" (`features/09_agente_whatsapp.feature`, @HU-9.2 —
 * Issue #25). Corre gratis y rápido en CI: nunca llama a la red ni a
 * Anthropic/Deepgram/ElevenLabs/WhatsApp real. El "modelo" (Anthropic
 * mockeado acá mismo) simula la secuencia de tool calls esperada; a
 * diferencia de `agente-ruteo.steps.ts` (que simula el resultado de las
 * tools con fixtures), acá el `fetchImpl` mockeado de
 * `procesarMensajeEntrante` enruta las llamadas HTTP hacia los casos de uso
 * REALES del World (`consultarDisponibilidad`/`extenderAlquiler`) — así el
 * escenario valida de verdad "consulta disponibilidad" y "extiende la
 * orden" contra la lógica de negocio real, no solo que el loop de tool
 * calling llamó algo. La validación contra Claude/Deepgram/ElevenLabs de
 * verdad es un workflow de CI aparte — ver
 * `.github/workflows/agente-2-whatsapp-integration.yml`.
 *
 * El otro escenario de este feature ("Recordatorio de voz...", HU-9.1/
 * Issue #24) NO tiene step definitions acá a propósito — es responsabilidad
 * del `WhatsAppReminderJob` de `apps/workers`; `cucumber.cjs` lo filtra por
 * nombre para que esta suite no lo corra ni lo deje undefined.
 */

const TELEFONO_ESCENARIO = "573001234567";
const NUEVA_FECHA_FIN = "2026-09-12";

function usuarioAgente2(): UsuarioAutenticado {
  return { id: "agente-2-service-account", email: null, rol: "agente-2" };
}

Given(
  "que soy un Cliente con un alquiler activo hablando con el Agente 2 por WhatsApp",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "cliente";

    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Rotomartillo SDS",
      marca: "Makita",
      categoria: "Rotomartillos",
      tarifa_dia: 30_000,
    });
    await this.registrarUnidad.ejecutar({
      modelo_id: this.ultimoModelo.id,
      numero_serie: `SN-${randomUUID().slice(0, 8)}`,
    });

    this.ultimaOrden = await this.crearOrden.ejecutar(this.usuarioActualId, {
      modelo_id: this.ultimoModelo.id,
      tipo: "alquiler",
      fecha_inicio: "2026-09-01",
      fecha_fin: "2026-09-05",
      return_mode: "en_sede",
      direccion_entrega: "Calle 10 #5-20, Bogotá",
      zona_id: randomUUID(),
    });
    this.ultimaOrden = await this.orderRepository.actualizarEstado(this.ultimaOrden.id, "confirmada");
  },
);

When("pido por voz que me extiendan el alquiler", async function (this: ToolboxWorld) {
  this.fetchCallsAgente2 = [];
  const orden = this.ultimaOrden!;
  const modelo = this.ultimoModelo!;

  const fetchImpl = (async (url: string, init?: RequestInit) => {
    this.fetchCallsAgente2.push({ url, method: init?.method ?? "GET" });

    if (url.includes("/inventory/check-availability")) {
      const query = new URL(url).searchParams;
      const disponibilidad = await this.consultarDisponibilidad.ejecutar(
        query.get("modelo_id")!,
        query.get("fecha_inicio")!,
        query.get("fecha_fin")!,
      );
      return { ok: true, status: 200, json: async () => disponibilidad } as Response;
    }
    if (url.includes("/rentals/extend") && init?.method === "POST") {
      // `init.body` siempre es un string JSON acá (lo produce `rental-api-client.ts`
      // con `JSON.stringify(input)`) — se afirma el tipo en vez de convertirlo
      // implícitamente con `String()`, que en un `BodyInit` genérico podría dar
      // `"[object Object]"` en vez del JSON esperado.
      const body = JSON.parse(init.body as string) as {
        order_id: string;
        nueva_fecha_fin: string;
        modo_cobro?: "link_pago" | "acumular_a_factura_final";
      };
      const ordenExtendida = await this.extenderAlquiler.ejecutar(
        body.order_id,
        body.nueva_fecha_fin,
        body.modo_cobro,
        usuarioAgente2(),
      );
      this.ultimaOrden = ordenExtendida;
      return { ok: true, status: 200, json: async () => ordenExtendida } as Response;
    }
    throw new Error(`URL inesperada en el step de BDD del Agente 2: ${url}`);
  }) as unknown as typeof fetch;

  let llamada = 0;
  const anthropic: AnthropicMessagesClient = {
    create: async () => {
      llamada++;
      if (llamada === 1) {
        return {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-haiku-4-5",
          content: [
            {
              type: "tool_use",
              id: "toolu_1",
              name: "check_availability",
              input: { modelo_id: modelo.id, fecha_inicio: "2026-09-06", fecha_fin: NUEVA_FECHA_FIN },
            },
          ],
          stop_reason: "tool_use",
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        } as unknown as Anthropic.Message;
      }
      if (llamada === 2) {
        return {
          id: "msg_2",
          type: "message",
          role: "assistant",
          model: "claude-haiku-4-5",
          content: [
            {
              type: "tool_use",
              id: "toolu_2",
              name: "extend_rental",
              input: { order_id: orden.id, nueva_fecha_fin: NUEVA_FECHA_FIN, modo_cobro: "link_pago" },
            },
          ],
          stop_reason: "tool_use",
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        } as unknown as Anthropic.Message;
      }
      return {
        id: "msg_3",
        type: "message",
        role: "assistant",
        model: "claude-haiku-4-5",
        content: [{ type: "text", text: "Listo, extendí tu alquiler hasta el 12 de septiembre.", citations: [] }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      } as unknown as Anthropic.Message;
    },
  };

  const speechToText = new InMemorySpeechToTextGateway();
  speechToText.transcripcion = "Quiero extender mi alquiler una semana más.";
  const whatsapp = new InMemoryWhatsAppMediaGateway();

  const deps: ProcesarMensajeEntranteDeps = {
    anthropic,
    model: "claude-haiku-4-5",
    apiBaseUrl: "https://api.example.com/api/v1",
    portalBaseUrl: "https://portal.example.com",
    authGateway: new InMemoryAgente2AuthGateway(),
    speechToText,
    textToSpeech: new InMemoryTextToSpeechGateway(),
    whatsapp,
    fetchImpl,
  };

  const mensaje: WebhookInboundMessage = {
    telefono: TELEFONO_ESCENARIO,
    waMessageId: "wamid.escenario",
    tipo: "audio",
    texto: null,
    audioMediaId: "media-escenario",
  };

  try {
    this.resultadoAgente2 = await procesarMensajeEntrante(deps, mensaje);
    this.whatsappMediaGatewayAgente2 = whatsapp;
    this.speechToTextGatewayAgente2 = speechToText;
  } catch (error) {
    this.errorAgente2 = error as Error;
  }
});

Then("el agente transcribe mi solicitud con Deepgram STT", function (this: ToolboxWorld) {
  assert.ok(!this.errorAgente2, `El procesamiento falló inesperadamente: ${this.errorAgente2?.message}`);
  assert.equal(this.speechToTextGatewayAgente2?.llamadas.length, 1, "Se esperaba una transcripción de Deepgram");
  assert.equal(this.resultadoAgente2?.transcripcion, "Quiero extender mi alquiler una semana más.");
});

Then(
  /^consulta disponibilidad futura vía GET \/inventory\/check-availability$/,
  function (this: ToolboxWorld) {
    assert.ok(
      this.fetchCallsAgente2.some((c) => c.url.includes("/inventory/check-availability") && c.method === "GET"),
      "Se esperaba una llamada GET a /inventory/check-availability",
    );
  },
);

Then(
  /^me ofrece pagar la diferencia por link de pago o acumularla a la factura final vía POST \/rentals\/extend$/,
  function (this: ToolboxWorld) {
    assert.ok(
      this.fetchCallsAgente2.some((c) => c.url.includes("/rentals/extend") && c.method === "POST"),
      "Se esperaba una llamada POST a /rentals/extend",
    );
    // La orden efectivamente quedó extendida (no solo que se llamó al endpoint).
    assert.equal(this.ultimaOrden?.fecha_fin, NUEVA_FECHA_FIN);
    // El modo de cobro elegido en este escenario (link_pago) se refleja en
    // la respuesta final que el cliente recibe por WhatsApp.
    assert.match(this.resultadoAgente2!.respuestaTexto, /portal\.example\.com\/mis-pedidos/);
    assert.equal(this.whatsappMediaGatewayAgente2?.notasDeVozEnviadas.length, 1);
  },
);
