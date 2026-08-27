import { sintetizarVoz } from "./text-to-speech";

describe("sintetizarVoz", () => {
  it("llama a ElevenLabs con el voiceId/apiKey dados y devuelve el audio como Buffer", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("audio-binario").buffer,
    });

    const resultado = await sintetizarVoz("Hola mundo", "api-key-123", "voice-abc", fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/text-to-speech/voice-abc",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "xi-api-key": "api-key-123", Accept: "audio/mpeg" }),
        body: JSON.stringify({ text: "Hola mundo", model_id: "eleven_multilingual_v2" }),
      }),
    );
    expect(Buffer.isBuffer(resultado)).toBe(true);
  });

  it("lanza un Error con el status y el cuerpo si ElevenLabs responde con error", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    });

    await expect(
      sintetizarVoz("Hola", "api-key-123", "voice-abc", fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/respondió 401/);
  });
});
