import {
  ANTHROPIC_MODEL_DEFAULT,
  ELEVENLABS_VOICE_ID_DEFAULT,
  loadAnthropicConfig,
  loadApiBaseUrl,
  loadDeepgramConfig,
  loadElevenLabsConfig,
  loadLiveKitConfig,
  loadPort,
} from "./config";

describe("loadAnthropicConfig", () => {
  it("lanza si falta ANTHROPIC_API_KEY", () => {
    expect(() => loadAnthropicConfig({})).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("usa el modelo default si no se define ANTHROPIC_MODEL", () => {
    const config = loadAnthropicConfig({ ANTHROPIC_API_KEY: "sk-test" });
    expect(config).toEqual({ apiKey: "sk-test", model: ANTHROPIC_MODEL_DEFAULT });
  });

  it("respeta ANTHROPIC_MODEL si está definido", () => {
    const config = loadAnthropicConfig({ ANTHROPIC_API_KEY: "sk-test", ANTHROPIC_MODEL: "claude-opus-4" });
    expect(config.model).toBe("claude-opus-4");
  });
});

describe("loadApiBaseUrl", () => {
  it("lanza si falta TOOLBOXJL_API_BASE_URL", () => {
    expect(() => loadApiBaseUrl({})).toThrow(/TOOLBOXJL_API_BASE_URL/);
  });

  it("quita la barra final si está presente", () => {
    expect(loadApiBaseUrl({ TOOLBOXJL_API_BASE_URL: "https://api.example.com/" })).toBe(
      "https://api.example.com",
    );
  });

  it("deja la URL intacta si no tiene barra final", () => {
    expect(loadApiBaseUrl({ TOOLBOXJL_API_BASE_URL: "https://api.example.com" })).toBe(
      "https://api.example.com",
    );
  });
});

describe("loadDeepgramConfig", () => {
  it("lanza si falta DEEPGRAM_API_KEY", () => {
    expect(() => loadDeepgramConfig({})).toThrow(/DEEPGRAM_API_KEY/);
  });

  it("devuelve la key si está definida", () => {
    expect(loadDeepgramConfig({ DEEPGRAM_API_KEY: "dg-test" })).toEqual({ apiKey: "dg-test" });
  });
});

describe("loadElevenLabsConfig", () => {
  it("lanza si falta ELEVENLABS_API_KEY", () => {
    expect(() => loadElevenLabsConfig({})).toThrow(/ELEVENLABS_API_KEY/);
  });

  it("usa el voice_id default si no se define ELEVENLABS_VOICE_ID", () => {
    const config = loadElevenLabsConfig({ ELEVENLABS_API_KEY: "el-test" });
    expect(config).toEqual({ apiKey: "el-test", voiceId: ELEVENLABS_VOICE_ID_DEFAULT });
  });
});

describe("loadLiveKitConfig", () => {
  it("lanza si falta cualquiera de las tres variables", () => {
    expect(() => loadLiveKitConfig({ LIVEKIT_URL: "wss://x" })).toThrow(/LIVEKIT_URL/);
    expect(() =>
      loadLiveKitConfig({ LIVEKIT_URL: "wss://x", LIVEKIT_API_KEY: "k" }),
    ).toThrow(/LIVEKIT_API_SECRET/);
  });

  it("devuelve la config completa si las tres están definidas", () => {
    const config = loadLiveKitConfig({
      LIVEKIT_URL: "wss://x.livekit.cloud",
      LIVEKIT_API_KEY: "APIkey",
      LIVEKIT_API_SECRET: "secret",
    });
    expect(config).toEqual({ url: "wss://x.livekit.cloud", apiKey: "APIkey", apiSecret: "secret" });
  });
});

describe("loadPort", () => {
  it("usa 8080 por default si no se define PORT", () => {
    expect(loadPort({})).toBe(8080);
  });

  it("respeta PORT si está definido", () => {
    expect(loadPort({ PORT: "3001" })).toBe(3001);
  });

  it("lanza si PORT no es un entero positivo", () => {
    expect(() => loadPort({ PORT: "abc" })).toThrow(/PORT inválido/);
    expect(() => loadPort({ PORT: "-1" })).toThrow(/PORT inválido/);
  });
});
