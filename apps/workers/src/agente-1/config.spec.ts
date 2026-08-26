import {
  ANTHROPIC_MODEL_DEFAULT,
  loadAgente1ServiceCredentials,
  loadAnthropicConfig,
  loadApiBaseUrl,
  loadSupabaseRestConfig,
} from "./config";

describe("loadAnthropicConfig", () => {
  it("lanza si ANTHROPIC_API_KEY no está definida", () => {
    expect(() => loadAnthropicConfig({})).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("usa el modelo Haiku por defecto si ANTHROPIC_MODEL no está definida", () => {
    const config = loadAnthropicConfig({ ANTHROPIC_API_KEY: "sk-ant-test" });
    expect(config.apiKey).toBe("sk-ant-test");
    expect(config.model).toBe(ANTHROPIC_MODEL_DEFAULT);
  });

  it("respeta ANTHROPIC_MODEL cuando está definida (permite subir de modelo sin tocar código)", () => {
    const config = loadAnthropicConfig({
      ANTHROPIC_API_KEY: "sk-ant-test",
      ANTHROPIC_MODEL: "claude-sonnet-5",
    });
    expect(config.model).toBe("claude-sonnet-5");
  });
});

describe("loadApiBaseUrl", () => {
  it("lanza si API_BASE_URL no está definida", () => {
    expect(() => loadApiBaseUrl({})).toThrow(/API_BASE_URL/);
  });

  it("quita la barra final si está presente", () => {
    expect(loadApiBaseUrl({ API_BASE_URL: "https://api.example.com/" })).toBe(
      "https://api.example.com",
    );
  });

  it("deja la URL igual si no tiene barra final", () => {
    expect(loadApiBaseUrl({ API_BASE_URL: "https://api.example.com" })).toBe(
      "https://api.example.com",
    );
  });
});

describe("loadAgente1ServiceCredentials", () => {
  it("lanza si falta AGENTE_1_SERVICE_EMAIL o AGENTE_1_SERVICE_PASSWORD", () => {
    expect(() => loadAgente1ServiceCredentials({ AGENTE_1_SERVICE_EMAIL: "a@b.com" })).toThrow(
      /AGENTE_1_SERVICE_EMAIL/,
    );
    expect(() => loadAgente1ServiceCredentials({})).toThrow(/AGENTE_1_SERVICE_EMAIL/);
  });

  it("devuelve las credenciales cuando ambas están definidas", () => {
    const credenciales = loadAgente1ServiceCredentials({
      AGENTE_1_SERVICE_EMAIL: "agente-ruteo@toolboxjl.internal",
      AGENTE_1_SERVICE_PASSWORD: "secreta",
    });
    expect(credenciales).toEqual({
      email: "agente-ruteo@toolboxjl.internal",
      password: "secreta",
    });
  });
});

describe("loadSupabaseRestConfig", () => {
  it("lanza si falta SUPABASE_URL o SUPABASE_ANON_KEY", () => {
    expect(() => loadSupabaseRestConfig({ SUPABASE_URL: "https://x.supabase.co" })).toThrow(
      /SUPABASE_URL/,
    );
  });

  it("quita la barra final de SUPABASE_URL", () => {
    const config = loadSupabaseRestConfig({
      SUPABASE_URL: "https://x.supabase.co/",
      SUPABASE_ANON_KEY: "anon-key",
    });
    expect(config.url).toBe("https://x.supabase.co");
    expect(config.anonKey).toBe("anon-key");
  });
});
