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

function mensajeTexto(overrides: Partial<WebhookInboundMessage> = {}): WebhookInboundMessage {
  return {
    telefono: "573001234567",
    waMessageId: "wamid.1",
    tipo: "text",
    texto: "Quiero extender mi alquiler.",
    audioMediaId: null,
    ...overrides,
  };
}

function mensajeAudio(overrides: Partial<WebhookInboundMessage> = {}): WebhookInboundMessage {
  return {
    telefono: "573001234567",
    waMessageId: "wamid.2",
    tipo: "audio",
    texto: null,
    audioMediaId: "media-abc",
    ...overrides,
  };
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

function armarDeps(overrides: Partial<ProcesarMensajeEntranteDeps> = {}): {
  deps: ProcesarMensajeEntranteDeps;
  whatsapp: InMemoryWhatsAppMediaGateway;
  stt: InMemorySpeechToTextGateway;
  tts: InMemoryTextToSpeechGateway;
} {
  const whatsapp = new InMemoryWhatsAppMediaGateway();
  const stt = new InMemorySpeechToTextGateway();
  const tts = new InMemoryTextToSpeechGateway();

  const deps: ProcesarMensajeEntranteDeps = {
    anthropic: { create: async () => sinToolCalls("Listo.") },
    model: "claude-haiku-4-5",
    apiBaseUrl: "https://api.example.com/api/v1",
    portalBaseUrl: "https://portal.example.com",
    authGateway: new InMemoryAgente2AuthGateway(),
    speechToText: stt,
    textToSpeech: tts,
    whatsapp,
    fetchImpl: fetchMockDe({}),
    ...overrides,
  };
  return { deps, whatsapp, stt, tts };
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

describe("procesarMensajeEntrante", () => {
  it("responde por texto cuando el mensaje entrante es texto (sin llamar STT/TTS)", async () => {
    const { deps, whatsapp, stt, tts } = armarDeps();

    const resultado = await procesarMensajeEntrante(deps, mensajeTexto());

    expect(resultado.respuestaTexto).toBe("Listo.");
    expect(whatsapp.textosEnviados).toEqual([{ telefono: "573001234567", texto: "Listo." }]);
    expect(whatsapp.notasDeVozEnviadas).toHaveLength(0);
    expect(stt.llamadas).toHaveLength(0);
    expect(tts.textosSintetizados).toHaveLength(0);
  });

  it("transcribe con STT y responde con nota de voz (TTS) cuando el mensaje entrante es audio", async () => {
    const { deps, whatsapp, stt, tts } = armarDeps();
    stt.transcripcion = "Quiero extender mi pedido.";

    const resultado = await procesarMensajeEntrante(deps, mensajeAudio());

    expect(resultado.transcripcion).toBe("Quiero extender mi pedido.");
    expect(stt.llamadas).toHaveLength(1);
    expect(tts.textosSintetizados).toEqual(["Listo."]);
    expect(whatsapp.notasDeVozEnviadas).toHaveLength(1);
    expect(whatsapp.notasDeVozEnviadas[0].telefono).toBe("573001234567");
    expect(whatsapp.textosEnviados).toHaveLength(0);
  });

  it("responde con un mensaje de fallback y NO llama a Claude si la transcripción queda vacía", async () => {
    let llamadasAClaude = 0;
    const { deps, whatsapp } = armarDeps({
      anthropic: {
        create: async () => {
          llamadasAClaude++;
          return sinToolCalls("no debería llegar acá");
        },
      },
    });

    const resultado = await procesarMensajeEntrante(deps, mensajeTexto({ texto: "" }));

    expect(llamadasAClaude).toBe(0);
    expect(resultado.respuestaTexto).toMatch(/No pude entender/);
    expect(whatsapp.textosEnviados).toHaveLength(1);
  });

  it("ejecuta check_availability y extend_rental vía HTTP real (loopback) y arma el link de pago", async () => {
    let llamada = 0;
    const { deps, whatsapp } = armarDeps({
      anthropic: {
        create: async () => {
          llamada++;
          if (llamada === 1) {
            return toolUse("check_availability", {
              modelo_id: "modelo-1",
              fecha_inicio: "2026-09-05",
              fecha_fin: "2026-09-08",
            });
          }
          if (llamada === 2) {
            return toolUse(
              "extend_rental",
              { order_id: "orden-1", nueva_fecha_fin: "2026-09-08", modo_cobro: "link_pago" },
              "tool_2",
            );
          }
          return sinToolCalls("Listo, extendí tu alquiler.");
        },
      },
      fetchImpl: fetchMockDe({
        "check-availability": { modelo_id: "modelo-1", unidades_disponibles: 2 },
        "rentals/extend": { id: "orden-1", estado: "confirmada", fecha_fin: "2026-09-08" },
      }),
    });

    const resultado = await procesarMensajeEntrante(deps, mensajeTexto({ texto: "Extendé mi orden orden-1" }));

    expect(resultado.respuestaTexto).toContain("Listo, extendí tu alquiler.");
    expect(resultado.respuestaTexto).toContain("https://portal.example.com/mis-pedidos/orden-1");
    expect(whatsapp.textosEnviados).toHaveLength(1);
  });

  it("NO ofrece link de pago si modo_cobro fue acumular_a_factura_final", async () => {
    let llamada = 0;
    const { deps } = armarDeps({
      anthropic: {
        create: async () => {
          llamada++;
          if (llamada === 1) {
            return toolUse("extend_rental", {
              order_id: "orden-1",
              nueva_fecha_fin: "2026-09-08",
              modo_cobro: "acumular_a_factura_final",
            });
          }
          return sinToolCalls("Listo, quedó acumulado a tu factura final.");
        },
      },
      fetchImpl: fetchMockDe({
        "rentals/extend": { id: "orden-1", estado: "confirmada", fecha_fin: "2026-09-08" },
      }),
    });

    const resultado = await procesarMensajeEntrante(deps, mensajeTexto());

    expect(resultado.respuestaTexto).not.toContain("mis-pedidos");
  });
});
