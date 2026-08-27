import { WhatsAppMediaService } from "./whatsapp-media.service";

describe("WhatsAppMediaService", () => {
  const envOriginal = { ...process.env };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.WHATSAPP_TOKEN = "token-123";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-123";
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = "waba-123";
    fetchMock = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    process.env = { ...envOriginal };
    jest.restoreAllMocks();
  });

  function crearServicio(): WhatsAppMediaService {
    return new WhatsAppMediaService();
  }

  it("lanza si faltan las credenciales de WhatsApp al construir", () => {
    delete process.env.WHATSAPP_TOKEN;

    expect(() => crearServicio()).toThrow(/WHATSAPP_TOKEN/);
  });

  it("descargarAudio resuelve la URL del media y descarga el binario", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://cdn.example.com/audio.ogg", mime_type: "audio/ogg" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode("audio-binario").buffer,
      });

    const servicio = crearServicio();
    const resultado = await servicio.descargarAudio("media-1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://graph.facebook.com/v21.0/media-1",
      expect.objectContaining({ headers: { Authorization: "Bearer token-123" } }),
    );
    expect(resultado.mimeType).toBe("audio/ogg");
    expect(Buffer.isBuffer(resultado.buffer)).toBe(true);
  });

  it("descargarAudio usa audio/ogg por default si Meta no informa mime_type", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: "https://cdn.example.com/audio.ogg" }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });

    const servicio = crearServicio();
    const resultado = await servicio.descargarAudio("media-1");

    expect(resultado.mimeType).toBe("audio/ogg");
  });

  it("descargarAudio lanza si la API responde con error al resolver la URL", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });

    const servicio = crearServicio();
    await expect(servicio.descargarAudio("media-1")).rejects.toThrow(/respondió 404/);
  });

  it("descargarAudio lanza si la API no devuelve una URL descargable", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const servicio = crearServicio();
    await expect(servicio.descargarAudio("media-1")).rejects.toThrow(/no devolvió una URL/);
  });

  it("descargarAudio lanza si falla la descarga del binario", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: "https://cdn.example.com/audio.ogg" }) })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const servicio = crearServicio();
    await expect(servicio.descargarAudio("media-1")).rejects.toThrow(/respondió 500/);
  });

  it("enviarTexto envía un mensaje de tipo text al endpoint de messages", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    const servicio = crearServicio();
    await servicio.enviarTexto("573001234567", "Hola");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/phone-123/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "573001234567",
          type: "text",
          text: { body: "Hola" },
        }),
      }),
    );
  });

  it("enviarTexto lanza si la API responde con error", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, text: async () => "bad request" });

    const servicio = crearServicio();
    await expect(servicio.enviarTexto("573001234567", "Hola")).rejects.toThrow(/respondió 400/);
  });

  it("enviarNotaDeVoz sube el binario y luego envía el mensaje referenciando el media id", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "media-subido-1" }) })
      .mockResolvedValueOnce({ ok: true });

    const servicio = crearServicio();
    await servicio.enviarNotaDeVoz("573001234567", Buffer.from("audio"));

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://graph.facebook.com/v21.0/phone-123/media",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://graph.facebook.com/v21.0/phone-123/messages",
      expect.objectContaining({
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "573001234567",
          type: "audio",
          audio: { id: "media-subido-1" },
        }),
      }),
    );
  });

  it("enviarNotaDeVoz lanza si falla la subida del media", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 413, text: async () => "too large" });

    const servicio = crearServicio();
    await expect(servicio.enviarNotaDeVoz("573001234567", Buffer.from("audio"))).rejects.toThrow(
      /respondió 413/,
    );
  });

  it("enviarNotaDeVoz lanza si la subida no devuelve un media id", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const servicio = crearServicio();
    await expect(servicio.enviarNotaDeVoz("573001234567", Buffer.from("audio"))).rejects.toThrow(
      "WhatsApp Cloud API no devolvió un media id tras subir la nota de voz.",
    );
  });
});
