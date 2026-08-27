import { ElevenLabsTextToSpeechService } from "./elevenlabs-text-to-speech.service";

function mockFetch(response: { ok: boolean; status: number; arrayBuffer?: ArrayBuffer; body?: unknown }) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: response.ok,
      status: response.status,
      arrayBuffer: async () => response.arrayBuffer ?? new ArrayBuffer(0),
      text: async () => JSON.stringify(response.body ?? {}),
    } as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe("ElevenLabsTextToSpeechService", () => {
  it("hace POST a /v1/text-to-speech/{voiceId}?output_format=pcm_16000 y devuelve el Buffer PCM", async () => {
    const pcm = new Int16Array([1, 2, 3, 4]).buffer;
    const { fetchImpl, calls } = mockFetch({ ok: true, status: 200, arrayBuffer: pcm });
    const service = new ElevenLabsTextToSpeechService("el-api-key", "voice-diego", fetchImpl);

    const resultado = await service.sintetizar("Tenemos un taladro Bosch disponible.");

    expect(resultado).toEqual(Buffer.from(pcm));
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice-diego?output_format=pcm_16000");
    expect(calls[0].init?.method).toBe("POST");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers["xi-api-key"]).toBe("el-api-key");
    expect(headers.Accept).toBe("audio/pcm");
    const body = JSON.parse(String(calls[0].init?.body)) as { text: string; model_id: string };
    expect(body.text).toBe("Tenemos un taladro Bosch disponible.");
    expect(body.model_id).toBe("eleven_multilingual_v2");
  });

  it("lanza con el status y el cuerpo si la respuesta no es ok (ej. 401 — riesgo de credencial ya reportado)", async () => {
    const { fetchImpl } = mockFetch({ ok: false, status: 401, body: { detail: "invalid api key" } });
    const service = new ElevenLabsTextToSpeechService("el-api-key-invalida", "voice-diego", fetchImpl);

    await expect(service.sintetizar("hola")).rejects.toThrow(/ElevenLabs TTS respondió 401/);
  });
});
