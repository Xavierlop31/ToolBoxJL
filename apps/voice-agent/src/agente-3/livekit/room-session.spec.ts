import { EventEmitter } from "node:events";

/**
 * Mock MANUAL (no automock) de `@livekit/rtc-node` — automockear este módulo
 * requeriría que Jest lo `require()`ara primero para introspeccionar su
 * shape, lo que dispara la carga del binario nativo `@livekit/rtc-ffi-bindings`
 * (ver comentario de cabecera de `room-session.ts`: "no hay forma de
 * mockear eso sin reescribir la mitad del SDK"). Con un factory manual, Jest
 * NUNCA carga el módulo real — solo el objeto plano de abajo, con clases
 * livianas que imitan la forma que `room-session.ts` necesita (constructor +
 * los métodos que efectivamente llama). `RemoteAudioTrack` se mockea como
 * clase real (no objeto) porque `room-session.ts` hace `instanceof` contra
 * ella.
 */
jest.mock("@livekit/rtc-node", () => {
  let participantesPendientes: Array<{ identity: string; metadata: string }> = [];
  let proximoReader: { read: jest.Mock } | null = null;
  const instanciasRoom: MockRoom[] = [];
  const instanciasAudioSource: MockAudioSource[] = [];

  class MockRoom extends EventEmitter {
    remoteParticipants: Map<string, { identity: string; metadata: string }>;
    localParticipant: { publishTrack: jest.Mock };
    connect: jest.Mock;
    disconnect: jest.Mock;

    constructor() {
      super();
      this.remoteParticipants = new Map(participantesPendientes.map((p) => [p.identity, p]));
      this.localParticipant = { publishTrack: jest.fn().mockResolvedValue(undefined) };
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

jest.mock("../voice-turn-agent", () => ({
  ejecutarTurnoAgente3: jest.fn(),
}));

import { RoomEvent, TrackSource, RemoteAudioTrack } from "@livekit/rtc-node";
import { manejarSesionDeVoz, type RoomSessionDeps } from "./room-session";
import { mintarTokenDeAgente } from "./agent-token";
import { ejecutarTurnoAgente3 } from "../voice-turn-agent";
import { MetadataJwtNoEncontradoError } from "../metadata";

interface RtcNodeMockHelpers {
  __setParticipantesPendientes: (arr: Array<{ identity: string; metadata: string }>) => void;
  __setProximoReader: (reader: { read: jest.Mock } | null) => void;
  __ultimaRoomCreada: () => {
    connect: jest.Mock;
    disconnect: jest.Mock;
    localParticipant: { publishTrack: jest.Mock };
    remoteParticipants: Map<string, { identity: string; metadata: string }>;
    on: (event: string, listener: (...args: unknown[]) => void) => void;
    off: (event: string, listener: (...args: unknown[]) => void) => void;
    emit: (event: string, ...args: unknown[]) => boolean;
    listenerCount: (event: string) => number;
  };
  __ultimaAudioSourceCreada: () => { captureFrame: jest.Mock };
  __limpiarInstancias: () => void;
}

const rtcNode = jest.requireMock("@livekit/rtc-node") as unknown as RtcNodeMockHelpers;

const JWT_VALIDO = "aaa.bbb.ccc";

function crearDeps(overrides: Partial<RoomSessionDeps> = {}): RoomSessionDeps {
  return {
    liveKitConfig: { url: "wss://x.livekit.cloud", apiKey: "apikey", apiSecret: "apisecret" },
    anthropic: { create: jest.fn() },
    anthropicModel: "claude-haiku-4-5",
    apiBaseUrl: "https://api.example.com",
    speechToText: { transcribir: jest.fn().mockResolvedValue("hola, busco un taladro") },
    textToSpeech: { sintetizar: jest.fn().mockResolvedValue(Buffer.alloc(20)) },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    ...overrides,
  };
}

async function flushMicrotasks(veces = 25): Promise<void> {
  for (let i = 0; i < veces; i++) {
    await Promise.resolve();
  }
}

describe("manejarSesionDeVoz", () => {
  beforeEach(() => {
    rtcNode.__limpiarInstancias();
    (mintarTokenDeAgente as jest.Mock).mockClear();
    (mintarTokenDeAgente as jest.Mock).mockResolvedValue({ identity: "agente-3-bot-sala", token: "token-de-sala" });
    (ejecutarTurnoAgente3 as jest.Mock).mockReset();
  });

  it("se une a la sala, publica su track de audio local, y resuelve el JWT del cliente ya presente en los metadata", async () => {
    rtcNode.__setParticipantesPendientes([{ identity: "cliente-1", metadata: JWT_VALIDO }]);
    const deps = crearDeps();

    const cerrar = await manejarSesionDeVoz(deps, "sala-1");

    expect(mintarTokenDeAgente).toHaveBeenCalledWith(deps.liveKitConfig, "sala-1");

    const room = rtcNode.__ultimaRoomCreada();
    expect(room.connect).toHaveBeenCalledWith(deps.liveKitConfig.url, "token-de-sala");
    expect(room.localParticipant.publishTrack).toHaveBeenCalledTimes(1);
    const [track, options] = room.localParticipant.publishTrack.mock.calls[0];
    expect(track.name).toBe("agente-3-voz");
    expect(options.opts).toEqual({ source: TrackSource.SOURCE_MICROPHONE });

    expect(typeof cerrar).toBe("function");
  });

  it("resuelve el JWT recorriendo TODOS los remoteParticipants, no solo el primero", async () => {
    rtcNode.__setParticipantesPendientes([
      { identity: "otro-participante", metadata: "" },
      { identity: "cliente-1", metadata: JWT_VALIDO },
    ]);
    const deps = crearDeps();

    await expect(manejarSesionDeVoz(deps, "sala-1")).resolves.toBeDefined();
  });

  it("cerrar() desuscribe el listener de TrackSubscribed y desconecta la sala", async () => {
    rtcNode.__setParticipantesPendientes([{ identity: "cliente-1", metadata: JWT_VALIDO }]);
    const deps = crearDeps();

    const cerrar = await manejarSesionDeVoz(deps, "sala-1");
    const room = rtcNode.__ultimaRoomCreada();
    expect(room.listenerCount(RoomEvent.TrackSubscribed)).toBe(1);

    await cerrar();

    expect(room.listenerCount(RoomEvent.TrackSubscribed)).toBe(0);
    expect(room.disconnect).toHaveBeenCalledTimes(1);
    expect(deps.logger?.log).toHaveBeenCalledWith(expect.stringContaining('Sesión de la sala "sala-1" cerrada.'));
  });

  it('lanza MetadataJwtNoEncontradoError tras agotar los reintentos si ningún participante trae un JWT válido', async () => {
    jest.useFakeTimers();
    try {
      rtcNode.__setParticipantesPendientes([]);
      const deps = crearDeps();

      const promise = manejarSesionDeVoz(deps, "sala-sin-jwt");
      const assertion = expect(promise).rejects.toBeInstanceOf(MetadataJwtNoEncontradoError);

      await jest.advanceTimersByTimeAsync(5000);
      await assertion;

      // 5 intentos por default — se avisa por warn en los primeros 4 (el 5to lanza directo).
      expect(deps.logger?.warn).toHaveBeenCalledTimes(4);
    } finally {
      jest.useRealTimers();
    }
  });

  describe("procesamiento de un turno de audio", () => {
    function frame(data: Int16Array, sampleRate = 16000) {
      return { value: { data, sampleRate }, done: false };
    }

    function frameFuerte(muestras = 100): { value: { data: Int16Array; sampleRate: number }; done: boolean } {
      return frame(new Int16Array(muestras).fill(20000));
    }

    /** 700ms exactos de silencio a 16kHz — cierra el turno en un solo frame (>= silencioMsParaCerrarTurno default). */
    function frameSilencioQueCierraElTurno(): { value: { data: Int16Array; sampleRate: number }; done: boolean } {
      return frame(new Int16Array(11200).fill(0));
    }

    async function emitirTrackYEsperarLectura(reader: { read: jest.Mock }): Promise<void> {
      rtcNode.__setProximoReader(reader);
      const room = rtcNode.__ultimaRoomCreada();
      // `RemoteAudioTrack` real requiere un `OwnedTrack` de la FFI — acá solo
      // necesitamos que pase el chequeo `instanceof` que hace `room-session.ts`.
      const track = Object.create(RemoteAudioTrack.prototype) as InstanceType<typeof RemoteAudioTrack>;
      room.emit(RoomEvent.TrackSubscribed, track);
      await flushMicrotasks();
    }

    it("transcribe el turno, corre el loop de tool calling, sintetiza y publica la respuesta en la sala", async () => {
      rtcNode.__setParticipantesPendientes([{ identity: "cliente-1", metadata: JWT_VALIDO }]);
      const deps = crearDeps();
      (ejecutarTurnoAgente3 as jest.Mock).mockResolvedValue({
        mensajes: [{ role: "user", content: "hola" }],
        respuestaTexto: "Tenemos un taladro Bosch disponible.",
        carritoActualizado: null,
      });

      await manejarSesionDeVoz(deps, "sala-audio");

      const reader = {
        read: jest
          .fn()
          .mockResolvedValueOnce(frameFuerte())
          .mockResolvedValueOnce(frameSilencioQueCierraElTurno())
          .mockResolvedValue({ done: true }),
      };
      await emitirTrackYEsperarLectura(reader);

      expect(deps.speechToText.transcribir).toHaveBeenCalledTimes(1);
      const [wav, mimeType] = (deps.speechToText.transcribir as jest.Mock).mock.calls[0];
      expect(Buffer.isBuffer(wav)).toBe(true);
      expect(mimeType).toBe("audio/wav");

      expect(ejecutarTurnoAgente3).toHaveBeenCalledTimes(1);
      const [turnoDeps, mensajesPrevios, transcripcion] = (ejecutarTurnoAgente3 as jest.Mock).mock.calls[0];
      expect(turnoDeps.jwt).toBe(JWT_VALIDO);
      expect(mensajesPrevios).toEqual([]);
      expect(transcripcion).toBe("hola, busco un taladro");

      expect(deps.textToSpeech.sintetizar).toHaveBeenCalledWith("Tenemos un taladro Bosch disponible.");
      const audioSource = rtcNode.__ultimaAudioSourceCreada();
      expect(audioSource.captureFrame).toHaveBeenCalledTimes(1);
    });

    it("ignora el turno si la transcripción viene vacía (solo espacios) — no corre el loop de tool calling", async () => {
      rtcNode.__setParticipantesPendientes([{ identity: "cliente-1", metadata: JWT_VALIDO }]);
      const deps = crearDeps({ speechToText: { transcribir: jest.fn().mockResolvedValue("   ") } });

      await manejarSesionDeVoz(deps, "sala-audio-vacio");

      const reader = {
        read: jest
          .fn()
          .mockResolvedValueOnce(frameFuerte())
          .mockResolvedValueOnce(frameSilencioQueCierraElTurno())
          .mockResolvedValue({ done: true }),
      };
      await emitirTrackYEsperarLectura(reader);

      expect(ejecutarTurnoAgente3).not.toHaveBeenCalled();
      expect(deps.textToSpeech.sintetizar).not.toHaveBeenCalled();
    });

    it("loguea el error y NO propaga si falla la transcripción (Deepgram caído)", async () => {
      rtcNode.__setParticipantesPendientes([{ identity: "cliente-1", metadata: JWT_VALIDO }]);
      const deps = crearDeps({
        speechToText: { transcribir: jest.fn().mockRejectedValue(new Error("Deepgram no disponible")) },
      });

      await manejarSesionDeVoz(deps, "sala-audio-error");

      const reader = {
        read: jest
          .fn()
          .mockResolvedValueOnce(frameFuerte())
          .mockResolvedValueOnce(frameSilencioQueCierraElTurno())
          .mockResolvedValue({ done: true }),
      };
      await emitirTrackYEsperarLectura(reader);

      expect(deps.logger?.error).toHaveBeenCalledWith(
        expect.stringContaining('Error procesando turno en sala "sala-audio-error"'),
        expect.any(Error),
      );
      expect(deps.textToSpeech.sintetizar).not.toHaveBeenCalled();
    });

    it("ignora tracks remotos que no son de audio (no instancia de RemoteAudioTrack)", async () => {
      rtcNode.__setParticipantesPendientes([{ identity: "cliente-1", metadata: JWT_VALIDO }]);
      const deps = crearDeps();

      await manejarSesionDeVoz(deps, "sala-video");
      const room = rtcNode.__ultimaRoomCreada();
      room.emit(RoomEvent.TrackSubscribed, { esOtroTipoDeTrack: true });
      await flushMicrotasks();

      expect(deps.speechToText.transcribir).not.toHaveBeenCalled();
    });

    it("loguea el error y NO propaga si falla la lectura del stream de audio", async () => {
      rtcNode.__setParticipantesPendientes([{ identity: "cliente-1", metadata: JWT_VALIDO }]);
      const deps = crearDeps();

      await manejarSesionDeVoz(deps, "sala-stream-error");
      const reader = { read: jest.fn().mockRejectedValue(new Error("stream cortado")) };
      await emitirTrackYEsperarLectura(reader);

      expect(deps.logger?.error).toHaveBeenCalledWith(
        expect.stringContaining('Error leyendo el stream de audio de la sala "sala-stream-error"'),
        expect.any(Error),
      );
    });
  });
});
