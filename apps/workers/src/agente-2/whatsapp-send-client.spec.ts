import { enviarNotaDeVoz } from "./whatsapp-send-client";

const credenciales = { token: "token-123", phoneNumberId: "phone-123" };

describe("enviarNotaDeVoz", () => {
  it("sube el binario y luego envía el mensaje referenciando el media id", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "media-1" }) })
      .mockResolvedValueOnce({ ok: true });

    await enviarNotaDeVoz("573001234567", Buffer.from("audio"), credenciales, fetchMock as unknown as typeof fetch);

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
          audio: { id: "media-1" },
        }),
      }),
    );
  });

  it("lanza un Error si falla la subida del media", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: false, status: 413, text: async () => "too large" });

    await expect(
      enviarNotaDeVoz("573001234567", Buffer.from("audio"), credenciales, fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/respondió 413/);
  });

  it("lanza un Error si la subida no devuelve un media id", async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await expect(
      enviarNotaDeVoz("573001234567", Buffer.from("audio"), credenciales, fetchMock as unknown as typeof fetch),
    ).rejects.toThrow("WhatsApp Cloud API no devolvió un media id tras subir el recordatorio.");
  });

  it("lanza un Error si falla el envío del mensaje final", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "media-1" }) })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "server error" });

    await expect(
      enviarNotaDeVoz("573001234567", Buffer.from("audio"), credenciales, fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/respondió 500/);
  });
});
