import { EventEmitter } from "node:events";
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Golden set del Agente 3 (Conserje de voz, TRD §6/§4.3): a diferencia de
 * `room-session.spec.ts` (que mockea `../voice-turn-agent` completo para
 * aislar el pipeline LiveKit), este archivo deja correr el loop de tool
 * calling REAL (`ejecutarTurnoAgente3`, `catalog-api-client.ts`,
 * `cart-api-client.ts`) y solo mockea el cliente de Anthropic
 * (`deps.anthropic`) y el `fetch` global — `room-session.ts` no le pasa
 * `fetchImpl` a `ejecutarTurnoAgente3` (ver `manejarTurno`), así que las
 * tools HTTP del Agente 3 caen al `fetch` global por default. Esto permite
 * asertar sobre QUÉ TOOL se invocó y con QUÉ PARÁMETROS exactos, no solo
 * sobre el texto final — mismo criterio que los golden set de Agente 1 y
 * Agente 2.
 *
 * El mock manual de `@livekit/rtc-node` es el mismo que `room-session.spec.ts`
 * (automockear el módulo real dispara la carga del binario nativo
 * `@livekit/rtc-ffi-bindings` — no hay forma de mockear eso sin reescribir
 * la mitad del SDK).
 */
jest.mock("@livekit/rtc-node", () => {
  let participantesPendientes: Array<{ identity: string; metadata: string }> = [];
  let proximoReader: { read: jest.Mock } | null = null;
  const instanciasRoom: MockRoom[] = [];
  const instanciasAudioSource: MockAudioSource[] = [];

  class MockRoom extends EventEmitter {
    remoteParticipants: Map<string, { identity: string; metadata: string }>;
    localParticipant: { publishTrack: jest.Mock; publishData: jest.Mock };
    connect: jest.Mock;
    disconnect: jest.Mock;

    constructor() {
      super();
      this.remoteParticipants = new Map(participantesPendientes.map((p) => [p.identity, p]));
      this.localParticipant = {
        publishTrack: jest.fn().mockResolvedValue(undefined),
        publishData: jest.fn().mockResolvedValue(undefined),
      };
      this.connect = jest.fn().mockResolvedValue(undefined);
      this.disconnect = jest.fn().mockResolvedValue(undefined);
      instanciasRoom.push(this);
    }
  }

  class MockRemoteAudioTrack {}

  class MockAudioSource {
    sampleRate: number;
    numChannels: number;
    captureFrame: jest.Mock;

    constructor(sampleRate: number, numChannels: number) {
      this.sampleRate = sampleRate;
      this.numChannels = numChannels;
      this.captureFrame = jest.fn().mockResolvedValue(undefined);
      instanciasAudioSource.push(this);
    }
  }

  class MockLocalAudioTrack {
    static createAudioTrack = jest.fn((name: string, source: unknown) => ({ name, source }));
  }

  class MockAudioStream {
    track: unknown;
    sampleRate: number;
    numChannels: number;

    constructor(track: unknown, sampleRate: number, numChannels: number) {
      this.track = track;
      this.sampleRate = sampleRate;
      this.numChannels = numChannels;
    }

    getReader(): { read: jest.Mock } {
      return proximoReader ?? { read: jest.fn().mockResolvedValue({ done: true }) };
    }
  }

  class MockAudioFrame {
    data: Int16Array;
    sampleRate: number;
    numChannels: number;
    samplesPerChannel: number;

    constructor(data: Int16Array, sampleRate: number, numChannels: number, samplesPerChannel: number) {
      this.data = data;
      this.sampleRate = sampleRate;
      this.numChannels = numChannels;
      this.samplesPerChannel = samplesPerChannel;
    }
  }

  class MockTrackPublishOptions {
    opts: unknown;
    constructor(opts: unknown) {
      this.opts = opts;
    }
  }

  return {
    __esModule: true,
    Room: MockRoom,
    RemoteAudioTrack: MockRemoteAudioTrack,
    AudioSource: MockAudioSource,
    LocalAudioTrack: MockLocalAudioTrack,
    AudioStream: MockAudioStream,
    AudioFrame: MockAudioFrame,
    TrackPublishOptions: MockTrackPublishOptions,
    TrackSource: { SOURCE_MICROPHONE: "SOURCE_MICROPHONE" },
    RoomEvent: { TrackSubscribed: "trackSubscribed" },
    __setParticipantesPendientes: (arr: Array<{ identity: string; metadata: string }>) => {
      participantesPendientes = [...arr];
    },
    __setProximoReader: (reader: { read: jest.Mock } | null) => {
      proximoReader = reader;
    },
    __ultimaRoomCreada: () => instanciasRoom[instanciasRoom.length - 1],
    __ultimaAudioSourceCreada: () => instanciasAudioSource[instanciasAudioSource.length - 1],
    __limpiarInstancias: () => {
      instanciasRoom.length = 0;
      instanciasAudioSource.length = 0;
      participantesPendientes = [];
      proximoReader = null;
    },
  };
});

jest.mock("./agent-token", () => ({
  mintarTokenDeAgente: jest.fn().mockResolvedValue({ identity: "agente-3-bot-sala", token: "token-de-sala" }),
}));

// NO se mockea "../voice-turn-agent": el golden set corre el loop de tool
// calling REAL, solo mockeando `deps.anthropic` y el `fetch` global.

import { RoomEvent, RemoteAudioTrack } from "@livekit/rtc-node";
import { manejarSesionDeVoz, type RoomSessionDeps } from "./room-session";
import { mintarTokenDeAgente } from "./agent-token";
import type { AnthropicMessagesClient } from "../voice-turn-agent";

interface RtcNodeMockHelpers {
  __setParticipantesPendientes: (arr: Array<{ identity: string; metadata: string }>) => void;
  __setProximoReader: (reader: { read: jest.Mock } | null) => void;
  __ultimaRoomCreada: () => {
    localParticipant: { publishTrack: jest.Mock; publishData: jest.Mock };
    remoteParticipants: Map<string, { identity: string; metadata: string }>;
    emit: (event: string, ...args: unknown[]) => boolean;
  };
  __ultimaAudioSourceCreada: () => { captureFrame: jest.Mock };
  __limpiarInstancias: () => void;
}

const rtcNode = jest.requireMock("@livekit/rtc-node") as unknown as RtcNodeMockHelpers;

const JWT_VALIDO = "aaa.bbb.ccc";
const MODELO_TALADRO = "33333333-3333-3333-3333-333333333333";

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

/** Secuencia de respuestas mock de Claude, una por iteración del loop de `ejecutarTurnoAgente3`. */
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

function fetchGlobalMockDe(rutas: Record<string, unknown>): jest.Mock {
  return jest.fn(async (url: string) => {
    for (const [sufijo, cuerpo] of Object.entries(rutas)) {
      if (url.includes(sufijo)) {
        return { ok: true, status: 200, json: async () => cuerpo } as Response;
      }
    }
    throw new Error(`fetch global inesperado en el golden set: ${url}`);
  });
}

function crearDeps(overrides: Partial<RoomSessionDeps> = {}): RoomSessionDeps {
  return {
    liveKitConfig: { url: "wss://x.livekit.cloud", apiKey: "apikey", apiSecret: "apisecret" },
    anthropic: { create: jest.fn() },
    anthropicModel: "claude-haiku-4-5",
    apiBaseUrl: "https://api.example.com",
    speechToText: { transcribir: jest.fn().mockResolvedValue("busco un taladro percutor para concreto") },
    textToSpeech: { sintetizar: jest.fn().mockResolvedValue(Buffer.alloc(20)) },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    ...overrides,
  };
}

async function flushMicrotasks(veces = 40): Promise<void> {
  for (let i = 0; i < veces; i++) {
    await Promise.resolve();
  }
}

function frame(data: Int16Array, sampleRate = 16000): { value: { data: Int16Array; sampleRate: number }; done: boolean } {
  return { value: { data, sampleRate }, done: false };
}

function frameFuerte(muestras = 100): { value: { data: Int16Array; sampleRate: number }; done: boolean } {
  return frame(new Int16Array(muestras).fill(20000));
}

/** 700ms exactos de silencio a 16kHz — cierra el turno en un solo frame. */
function frameSilencioQueCierraElTurno(): { value: { data: Int16Array; sampleRate: number }; done: boolean } {
  return frame(new Int16Array(11200).fill(0));
}

async function emitirTurnoDeAudio(): Promise<void> {
  const reader = {
    read: jest
      .fn()
      .mockResolvedValueOnce(frameFuerte())
      .mockResolvedValueOnce(frameSilencioQueCierraElTurno())
      .mockResolvedValue({ done: true }),
  };
  rtcNode.__setProximoReader(reader);
  const room = rtcNode.__ultimaRoomCreada();
  const track = Object.create(RemoteAudioTrack.prototype) as InstanceType<typeof RemoteAudioTrack>;
  room.emit(RoomEvent.TrackSubscribed, track);
  await flushMicrotasks();
}

describe("Golden set — Agente 3 (Conserje de voz, loop de tool calling REAL)", () => {
  let fetchOriginal: typeof fetch;

  beforeEach(() => {
    rtcNode.__limpiarInstancias();
    (mintarTokenDeAgente as jest.Mock).mockClear();
    (mintarTokenDeAgente as jest.Mock).mockResolvedValue({ identity: "agente-3-bot-sala", token: "token-de-sala" });
    fetchOriginal = global.fetch;
    rtcNode.__setParticipantesPendientes([{ identity: "cliente-1", metadata: JWT_VALIDO }]);
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  it("1. pide una herramienta con categoría + atributo → primer tool call es search_catalog con los parámetros del pedido", async () => {
    const fetchMock = fetchGlobalMockDe({
      "/catalog/search": [
        { id: MODELO_TALADRO, nombre: "Taladro Percutor Bosch", marca: "Bosch", categoria: "taladro", tarifa_dia: 20000, tarifa_semana: 100000 },
      ],
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const anthropic = anthropicConSecuencia([
      toolUse("search_catalog", { q: "taladro percutor", categoria: "taladro" }, "tool_1"),
      sinToolCalls("Tenemos un Taladro Percutor Bosch disponible, ¿te sirve?"),
    ]);
    const deps = crearDeps({ anthropic });

    await manejarSesionDeVoz(deps, "sala-busqueda");
    await emitirTurnoDeAudio();

    const llamadaBusqueda = fetchMock.mock.calls.find(([url]: [string]) => url.includes("/catalog/search"));
    expect(llamadaBusqueda).toBeDefined();
    const [urlBusqueda] = llamadaBusqueda as [string];
    expect(urlBusqueda).toContain("q=taladro");
    expect(urlBusqueda).toContain("categoria=taladro");
    expect(fetchMock.mock.calls.some(([url]: [string]) => url.includes("/cart/add-item"))).toBe(false);
  });

  it("1b. el tool call de search_catalog publica los chips running/done por el canal de datos de la sala (HU-14.2)", async () => {
    const fetchMock = fetchGlobalMockDe({
      "/catalog/search": [
        { id: MODELO_TALADRO, nombre: "Taladro Percutor Bosch", marca: "Bosch", categoria: "taladro", tarifa_dia: 20000, tarifa_semana: 100000 },
      ],
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const anthropic = anthropicConSecuencia([
      toolUse("search_catalog", { q: "taladro percutor", categoria: "taladro" }, "tool_1"),
      sinToolCalls("Tenemos un Taladro Percutor Bosch disponible, ¿te sirve?"),
    ]);
    const deps = crearDeps({ anthropic });

    await manejarSesionDeVoz(deps, "sala-tool-status");
    const room = rtcNode.__ultimaRoomCreada();
    room.localParticipant.publishData.mockClear(); // descarta el evento "greeting" del saludo (HU-14.1)

    await emitirTurnoDeAudio();

    const eventosPublicados = room.localParticipant.publishData.mock.calls.map(([data]: [Uint8Array]) =>
      JSON.parse(new TextDecoder().decode(data)),
    );
    expect(eventosPublicados).toEqual([
      { type: "tool_status", tool: "search_catalog", label: "Buscando en catálogo…", status: "running" },
      { type: "tool_status", tool: "search_catalog", label: "Buscando en catálogo…", status: "done" },
    ]);
  });

  it(
    "2. con resultados de búsqueda, NO agrega al carrito sin confirmación verbal del cliente en el turno — " +
      "*** enforcement HOY es solo de system prompt (ver tools.ts), no de código ***: este test simula un LLM " +
      "que respeta esa instrucción; `ejecutarTurnoAgente3` no tiene ningún guard propio que bloquee add_to_cart " +
      "si el LLM decidiera llamarla igual sin confirmación.",
    async () => {
      const fetchMock = fetchGlobalMockDe({
        "/catalog/search": [
          { id: MODELO_TALADRO, nombre: "Taladro Percutor Bosch", marca: "Bosch", categoria: "taladro", tarifa_dia: 20000, tarifa_semana: 100000 },
        ],
      });
      global.fetch = fetchMock as unknown as typeof fetch;
      const anthropic = anthropicConSecuencia([
        toolUse("search_catalog", { q: "taladro percutor", categoria: "taladro" }, "tool_1"),
        sinToolCalls("Tenemos un Taladro Percutor Bosch, ¿te gustaría agregarlo al carrito?"),
      ]);
      const deps = crearDeps({ anthropic });

      await manejarSesionDeVoz(deps, "sala-sin-confirmar");
      await emitirTurnoDeAudio();

      expect(fetchMock.mock.calls.some(([url]: [string]) => url.includes("/cart/add-item"))).toBe(false);
    },
  );

  it("3. tras confirmación verbal explícita, la tool call es add_to_cart con el modelo_id identificado en el turno", async () => {
    const fetchMock = fetchGlobalMockDe({
      "/cart/add-item": { items: [{ modelo_id: MODELO_TALADRO, cantidad: 1 }], total: 20000 },
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const anthropic = anthropicConSecuencia([
      toolUse("add_to_cart", { modelo_id: MODELO_TALADRO, cantidad: 1 }, "tool_2"),
      sinToolCalls("Listo, agregué el Taladro Percutor Bosch a tu carrito."),
    ]);
    const deps = crearDeps({
      anthropic,
      speechToText: { transcribir: jest.fn().mockResolvedValue("sí, ese, agregalo") },
    });

    await manejarSesionDeVoz(deps, "sala-confirmacion");
    await emitirTurnoDeAudio();

    const llamadaCarrito = fetchMock.mock.calls.find(([url]: [string]) => url.includes("/cart/add-item"));
    expect(llamadaCarrito).toBeDefined();
    const [, init] = llamadaCarrito as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ modelo_id: MODELO_TALADRO, cantidad: 1 });
  });

  it("4. búsqueda sin resultados → no intenta agregar nada al carrito, responde solo con texto", async () => {
    const fetchMock = fetchGlobalMockDe({ "/catalog/search": [] });
    global.fetch = fetchMock as unknown as typeof fetch;
    const anthropic = anthropicConSecuencia([
      toolUse("search_catalog", { q: "excavadora industrial" }, "tool_1"),
      sinToolCalls("No encontré ninguna excavadora industrial disponible, ¿buscamos otra herramienta?"),
    ]);
    const deps = crearDeps({
      anthropic,
      speechToText: { transcribir: jest.fn().mockResolvedValue("necesito una excavadora industrial") },
    });

    await manejarSesionDeVoz(deps, "sala-sin-resultados");
    await emitirTurnoDeAudio();

    expect(fetchMock.mock.calls.some(([url]: [string]) => url.includes("/cart/add-item"))).toBe(false);
    expect(deps.textToSpeech.sintetizar).toHaveBeenCalledWith(
      "No encontré ninguna excavadora industrial disponible, ¿buscamos otra herramienta?",
    );
  });
});
