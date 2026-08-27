import { DeepgramSpeechToTextService } from "./deepgram-speech-to-text.service";

function mockFetch(response: { ok: boolean; status: number; body: unknown }) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body),
    } as Response;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe("DeepgramSpeechToTextService", () => {
  it("hace POST a /v1/listen con el WAV como body, Content-Type=mimeType y el Authorization Token", async () => {
    const { fetchImpl, calls } = mockFetch({
      ok: true,
      status: 200,
      body: { results: { channels: [{ alternatives: [{ transcript: "hola, busco un taladro" }] }] } },
    });
    const service = new DeepgramSpeechToTextService("dg-api-key", fetchImpl);

    const transcripcion = await service.transcribir(Buffer.from("wav-fake"), "audio/wav");

    expect(transcripcion).toBe("hola, busco un taladro");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("https://api.deepgram.com/v1/listen");
    expect(calls[0].url).toContain("language=es");
    expect(calls[0].init?.method).toBe("POST");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Token dg-api-key");
    expect(headers["Content-Type"]).toBe("audio/wav");
    expect(calls[0].init?.body).toEqual(Buffer.from("wav-fake"));
  });

  it("devuelve string vacío si Deepgram no encuentra ningún transcript", async () => {
    const { fetchImpl } = mockFetch({ ok: true, status: 200, body: { results: { channels: [] } } });
    const service = new DeepgramSpeechToTextService("dg-api-key", fetchImpl);

    const transcripcion = await service.transcribir(Buffer.from("wav-fake"), "audio/wav");

    expect(transcripcion).toBe("");
  });

  it("recorta espacios del transcript", async () => {
    const { fetchImpl } = mockFetch({
      ok: true,
      status: 200,
      body: { results: { channels: [{ alternatives: [{ transcript: "  hola  " }] }] } },
    });
    const service = new DeepgramSpeechToTextService("dg-api-key", fetchImpl);

    expect(await service.transcribir(Buffer.from("wav-fake"), "audio/wav")).toBe("hola");
  });

  it("lanza con el status y el cuerpo si la respuesta no es ok", async () => {
    const { fetchImpl } = mockFetch({ ok: false, status: 401, body: { error: "unauthorized" } });
    const service = new DeepgramSpeechToTextService("dg-api-key-invalida", fetchImpl);

    await expect(service.transcribir(Buffer.from("wav-fake"), "audio/wav")).rejects.toThrow(
      /Deepgram STT respondió 401/,
    );
  });
});
