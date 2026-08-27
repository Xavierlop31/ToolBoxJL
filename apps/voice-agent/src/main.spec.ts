jest.mock("./agente-3/config", () => ({
  loadAnthropicConfig: jest.fn(),
  loadApiBaseUrl: jest.fn(),
  loadDeepgramConfig: jest.fn(),
  loadElevenLabsConfig: jest.fn(),
  loadLiveKitConfig: jest.fn(),
  loadPort: jest.fn(),
}));

jest.mock("@anthropic-ai/sdk", () =>
  jest.fn().mockImplementation(() => ({ messages: { create: jest.fn() } })),
);

jest.mock("./agente-3/infrastructure/deepgram-speech-to-text.service", () => ({
  DeepgramSpeechToTextService: jest.fn().mockImplementation(() => ({ transcribir: jest.fn() })),
}));

jest.mock("./agente-3/infrastructure/elevenlabs-text-to-speech.service", () => ({
  ElevenLabsTextToSpeechService: jest.fn().mockImplementation(() => ({ sintetizar: jest.fn() })),
}));

jest.mock("./agente-3/livekit/webhook-http-server", () => ({
  crearServidorWebhook: jest.fn(),
}));

jest.mock("./agente-3/livekit/room-session", () => ({
  manejarSesionDeVoz: jest.fn(),
}));

import {
  loadAnthropicConfig,
  loadApiBaseUrl,
  loadDeepgramConfig,
  loadElevenLabsConfig,
  loadLiveKitConfig,
  loadPort,
} from "./agente-3/config";
import { crearServidorWebhook, type WebhookHttpServerDeps } from "./agente-3/livekit/webhook-http-server";
import { manejarSesionDeVoz } from "./agente-3/livekit/room-session";
import { main } from "./main";

async function flushMicrotasks(veces = 10): Promise<void> {
  for (let i = 0; i < veces; i++) {
    await Promise.resolve();
  }
}

/**
 * `main.ts` es el entry point del proceso persistente — arma todas las
 * dependencias reales (config, cliente Anthropic, gateways de Deepgram/
 * ElevenLabs, servidor de webhooks) y las cablea. Se mockean TODAS esas
 * dependencias (mismo criterio que `room-session.spec.ts` con el SDK de
 * LiveKit) para poder testear la lógica de orquestación propia de este
 * archivo (dedup de sesiones activas, manejo de errores al unirse a una
 * sala, cierre ordenado en SIGTERM/SIGINT) sin tocar red ni credenciales
 * reales.
 */
describe("main (entry point del Agente 3)", () => {
  let servidorMock: { listen: jest.Mock; close: jest.Mock };
  let deps: WebhookHttpServerDeps | undefined;
  let processOnSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;
  let handlers: Record<string, () => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    deps = undefined;
    handlers = {};

    (loadAnthropicConfig as jest.Mock).mockReturnValue({ apiKey: "ak", model: "claude-haiku-4-5" });
    (loadApiBaseUrl as jest.Mock).mockReturnValue("https://api.example.com");
    (loadDeepgramConfig as jest.Mock).mockReturnValue({ apiKey: "dk" });
    (loadElevenLabsConfig as jest.Mock).mockReturnValue({ apiKey: "ek", voiceId: "voice-1" });
    (loadLiveKitConfig as jest.Mock).mockReturnValue({ url: "wss://x", apiKey: "lk", apiSecret: "ls" });
    (loadPort as jest.Mock).mockReturnValue(8080);

    servidorMock = {
      listen: jest.fn((_port: number, cb: () => void) => {
        cb();
        return servidorMock;
      }),
      close: jest.fn((cb: () => void) => cb()),
    };
    (crearServidorWebhook as jest.Mock).mockImplementation((d: WebhookHttpServerDeps) => {
      deps = d;
      return servidorMock;
    });

    processOnSpy = jest
      .spyOn(process, "on")
      .mockImplementation(((event: string, cb: () => void) => {
        handlers[event] = cb;
        return process;
      }) as never);
    processExitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    processOnSpy.mockRestore();
    processExitSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it("carga toda la config, arma el servidor de webhooks y escucha en el puerto configurado", async () => {
    await main();

    expect(loadAnthropicConfig).toHaveBeenCalled();
    expect(loadApiBaseUrl).toHaveBeenCalled();
    expect(loadDeepgramConfig).toHaveBeenCalled();
    expect(loadElevenLabsConfig).toHaveBeenCalled();
    expect(loadLiveKitConfig).toHaveBeenCalled();
    expect(loadPort).toHaveBeenCalled();
    expect(crearServidorWebhook).toHaveBeenCalledTimes(1);
    expect(servidorMock.listen).toHaveBeenCalledWith(8080, expect.any(Function));
    expect(process.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    expect(process.on).toHaveBeenCalledWith("SIGINT", expect.any(Function));
  });

  it("unirseASala: primera vez que ve la sala llama a manejarSesionDeVoz y guarda el cierre", async () => {
    const cerrarMock = jest.fn().mockResolvedValue(undefined);
    (manejarSesionDeVoz as jest.Mock).mockResolvedValue(cerrarMock);

    await main();
    await deps!.unirseASala("sala-1");

    expect(manejarSesionDeVoz).toHaveBeenCalledTimes(1);
    const [sesionDeps, roomName] = (manejarSesionDeVoz as jest.Mock).mock.calls[0];
    expect(roomName).toBe("sala-1");
    expect(sesionDeps.apiBaseUrl).toBe("https://api.example.com");
    expect(sesionDeps.anthropicModel).toBe("claude-haiku-4-5");
  });

  it("unirseASala: ignora el webhook duplicado si la sala ya tiene una sesión activa", async () => {
    const cerrarMock = jest.fn().mockResolvedValue(undefined);
    (manejarSesionDeVoz as jest.Mock).mockResolvedValue(cerrarMock);

    await main();
    await deps!.unirseASala("sala-dup");
    await deps!.unirseASala("sala-dup");

    expect(manejarSesionDeVoz).toHaveBeenCalledTimes(1);
  });

  it("unirseASala: si manejarSesionDeVoz falla, libera la sala (no queda marcada activa) y loguea el error", async () => {
    (manejarSesionDeVoz as jest.Mock)
      .mockRejectedValueOnce(new Error("LiveKit no disponible"))
      .mockResolvedValueOnce(jest.fn().mockResolvedValue(undefined));

    await main();
    await deps!.unirseASala("sala-error");
    // Como la primera falló, la sala se liberó — una segunda llamada NO debe tratarse como duplicado.
    await deps!.unirseASala("sala-error");

    expect(manejarSesionDeVoz).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('No se pudo unir a la sala "sala-error"'),
      expect.any(Error),
    );
  });

  it("SIGTERM: cierra todas las sesiones activas, cierra el servidor HTTP y sale con código 0", async () => {
    const cerrar1 = jest.fn().mockResolvedValue(undefined);
    const cerrar2 = jest.fn().mockResolvedValue(undefined);
    (manejarSesionDeVoz as jest.Mock).mockResolvedValueOnce(cerrar1).mockResolvedValueOnce(cerrar2);

    await main();
    await deps!.unirseASala("sala-a");
    await deps!.unirseASala("sala-b");

    // `process.on("SIGTERM", () => void cerrarTodoYSalir())` — el handler
    // real NO devuelve la promesa (fire-and-forget), así que se flushean
    // microtasks en vez de esperar un valor de retorno.
    handlers.SIGTERM();
    await flushMicrotasks();

    expect(cerrar1).toHaveBeenCalledTimes(1);
    expect(cerrar2).toHaveBeenCalledTimes(1);
    expect(servidorMock.close).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("SIGTERM: no revienta si el cierre de una sesión individual falla", async () => {
    const cerrarQueFalla = jest.fn().mockRejectedValue(new Error("no se pudo desconectar"));
    (manejarSesionDeVoz as jest.Mock).mockResolvedValue(cerrarQueFalla);

    await main();
    await deps!.unirseASala("sala-c");

    handlers.SIGTERM();
    await flushMicrotasks();

    expect(servidorMock.close).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(0);
  });
});
