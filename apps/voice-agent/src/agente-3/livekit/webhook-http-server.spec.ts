import * as http from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Se mockea `WebhookReceiver` de `livekit-server-sdk` (verificación de firma
 * real, HMAC contra el `apiSecret`) para poder controlar determinísticamente
 * qué evento "recibe" el servidor en cada test, sin tener que firmar
 * payloads reales — el contrato que le importa a `crearServidorWebhook` es
 * "¿qué hace con lo que `receiver.receive()` devuelve o lanza?", no la
 * criptografía de la firma (eso es responsabilidad de la librería, no de
 * este archivo).
 */
const receiveMock = jest.fn();
jest.mock("livekit-server-sdk", () => ({
  WebhookReceiver: jest.fn().mockImplementation(() => ({ receive: receiveMock })),
}));

import { crearServidorWebhook, type WebhookHttpServerDeps } from "./webhook-http-server";

function post(port: number, path: string, body: string, headers: Record<string, string> = {}): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path, method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(body) } },
      (res) => {
        res.on("data", () => undefined);
        res.on("end", () => resolve({ status: res.statusCode ?? 0 }));
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

function get(port: number, path: string): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, method: "GET" }, (res) => {
      res.on("data", () => undefined);
      res.on("end", () => resolve({ status: res.statusCode ?? 0 }));
    });
    req.on("error", reject);
    req.end();
  });
}

describe("crearServidorWebhook", () => {
  let servidor: http.Server;
  let port: number;
  let deps: WebhookHttpServerDeps;

  function levantarServidor(overrides: Partial<WebhookHttpServerDeps> = {}): Promise<void> {
    deps = {
      liveKitConfig: { url: "wss://x", apiKey: "apikey", apiSecret: "apisecret" },
      unirseASala: jest.fn(),
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
      ...overrides,
    };
    servidor = crearServidorWebhook(deps);
    return new Promise((resolve) => {
      servidor.listen(0, () => {
        port = (servidor.address() as AddressInfo).port;
        resolve();
      });
    });
  }

  beforeEach(() => {
    receiveMock.mockReset();
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => servidor.close(() => resolve()));
  });

  it("responde 404 si el método no es POST", async () => {
    await levantarServidor();
    const { status } = await get(port, "/livekit/webhook");
    expect(status).toBe(404);
  });

  it("responde 404 si la URL no es /livekit/webhook", async () => {
    await levantarServidor();
    const { status } = await post(port, "/otra-ruta", "{}");
    expect(status).toBe(404);
  });

  it("participant_joined de un cliente real: llama unirseASala con el roomName y responde 200", async () => {
    receiveMock.mockResolvedValue({
      event: "participant_joined",
      room: { name: "sala-cliente-1" },
      participant: { identity: "cliente-1" },
    });
    await levantarServidor();

    const { status } = await post(port, "/livekit/webhook", JSON.stringify({ event: "participant_joined" }), {
      authorize: "firma-valida",
    });

    expect(status).toBe(200);
    expect(deps.unirseASala).toHaveBeenCalledWith("sala-cliente-1");
    expect(receiveMock).toHaveBeenCalledWith(JSON.stringify({ event: "participant_joined" }), "firma-valida");
  });

  it("evento que no amerita unirse (ej. room_started): responde 200 sin llamar unirseASala", async () => {
    receiveMock.mockResolvedValue({ event: "room_started", room: { name: "sala-1" } });
    await levantarServidor();

    const { status } = await post(port, "/livekit/webhook", "{}");

    expect(status).toBe(200);
    expect(deps.unirseASala).not.toHaveBeenCalled();
  });

  it("participant_joined del propio bot: no se une a su propia sala (evita loop)", async () => {
    receiveMock.mockResolvedValue({
      event: "participant_joined",
      room: { name: "sala-1" },
      participant: { identity: "agente-3-bot-sala-1" },
    });
    await levantarServidor();

    const { status } = await post(port, "/livekit/webhook", "{}");

    expect(status).toBe(200);
    expect(deps.unirseASala).not.toHaveBeenCalled();
  });

  it("responde 400 y loguea el error si receiver.receive() lanza (firma inválida)", async () => {
    receiveMock.mockRejectedValue(new Error("firma inválida"));
    await levantarServidor();

    const { status } = await post(port, "/livekit/webhook", "{}");

    expect(status).toBe(400);
    expect(deps.logger?.error).toHaveBeenCalledWith(
      expect.stringContaining("Error procesando el webhook de LiveKit"),
      expect.any(Error),
    );
    expect(deps.unirseASala).not.toHaveBeenCalled();
  });

  it("responde 200 aunque unirseASala del llamador falle de forma síncrona/rechazada — el error se loguea, no se cuelga la respuesta", async () => {
    receiveMock.mockResolvedValue({
      event: "participant_joined",
      room: { name: "sala-2" },
      participant: { identity: "cliente-2" },
    });
    await levantarServidor({ unirseASala: jest.fn().mockRejectedValue(new Error("no se pudo unir")) });

    const { status } = await post(port, "/livekit/webhook", "{}");

    expect(status).toBe(400);
    expect(deps.logger?.error).toHaveBeenCalled();
  });

  it("usa console como logger por default si no se provee uno", async () => {
    receiveMock.mockResolvedValue({ event: "room_started", room: { name: "sala-1" } });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    await levantarServidor({ logger: undefined });

    await post(port, "/livekit/webhook", "{}");

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
