import {
  ANTHROPIC_MODEL_DEFAULT,
  loadAgente2ApiBaseUrl,
  loadAgente2ServiceCredentials,
  loadAnthropicConfig,
  loadPortalBaseUrl,
  loadSupabaseRestConfig,
} from "./config";

describe("agente-2/config", () => {
  describe("loadAnthropicConfig", () => {
    it("lanza si ANTHROPIC_API_KEY no está definida", () => {
      expect(() => loadAnthropicConfig({})).toThrow(/ANTHROPIC_API_KEY/);
    });

    it("usa el modelo default si ANTHROPIC_MODEL no está definida", () => {
      const config = loadAnthropicConfig({ ANTHROPIC_API_KEY: "sk-test" });

      expect(config).toEqual({ apiKey: "sk-test", model: ANTHROPIC_MODEL_DEFAULT });
    });

    it("respeta ANTHROPIC_MODEL cuando se provee", () => {
      const config = loadAnthropicConfig({ ANTHROPIC_API_KEY: "sk-test", ANTHROPIC_MODEL: "claude-opus" });

      expect(config.model).toBe("claude-opus");
    });
  });

  describe("loadAgente2ServiceCredentials", () => {
    it("lanza si falta el email o el password", () => {
      expect(() => loadAgente2ServiceCredentials({ AGENTE_2_SERVICE_EMAIL: "a@b.com" })).toThrow(
        /AGENTE_2_SERVICE_EMAIL/,
      );
      expect(() => loadAgente2ServiceCredentials({})).toThrow(/AGENTE_2_SERVICE_EMAIL/);
    });

    it("devuelve las credenciales cuando ambas están definidas", () => {
      const credenciales = loadAgente2ServiceCredentials({
        AGENTE_2_SERVICE_EMAIL: "agente-whatsapp@toolboxjl.internal",
        AGENTE_2_SERVICE_PASSWORD: "clave-secreta",
      });

      expect(credenciales).toEqual({
        email: "agente-whatsapp@toolboxjl.internal",
        password: "clave-secreta",
      });
    });
  });

  describe("loadSupabaseRestConfig", () => {
    it("lanza si falta SUPABASE_URL o SUPABASE_ANON_KEY", () => {
      expect(() => loadSupabaseRestConfig({})).toThrow(/SUPABASE_URL/);
    });

    it("quita el trailing slash de SUPABASE_URL", () => {
      const config = loadSupabaseRestConfig({
        SUPABASE_URL: "https://proyecto.supabase.co/",
        SUPABASE_ANON_KEY: "anon-key",
      });

      expect(config).toEqual({ url: "https://proyecto.supabase.co", anonKey: "anon-key" });
    });

    it("no toca la URL si ya no tiene trailing slash", () => {
      const config = loadSupabaseRestConfig({
        SUPABASE_URL: "https://proyecto.supabase.co",
        SUPABASE_ANON_KEY: "anon-key",
      });

      expect(config.url).toBe("https://proyecto.supabase.co");
    });
  });

  describe("loadAgente2ApiBaseUrl", () => {
    it("usa AGENTE_2_API_BASE_URL explícito, sin trailing slash", () => {
      expect(loadAgente2ApiBaseUrl({ AGENTE_2_API_BASE_URL: "https://api.example.com/" })).toBe(
        "https://api.example.com",
      );
    });

    it("cae a loopback con PORT cuando no hay override", () => {
      expect(loadAgente2ApiBaseUrl({ PORT: "4000" })).toBe("http://localhost:4000/api/v1");
    });

    it("usa el puerto 3000 por default si tampoco hay PORT", () => {
      expect(loadAgente2ApiBaseUrl({})).toBe("http://localhost:3000/api/v1");
    });
  });

  describe("loadPortalBaseUrl", () => {
    it("usa el default localhost:4201 si no hay PORTAL_BASE_URL", () => {
      expect(loadPortalBaseUrl({})).toBe("http://localhost:4201");
    });

    it("quita el trailing slash de PORTAL_BASE_URL cuando se provee", () => {
      expect(loadPortalBaseUrl({ PORTAL_BASE_URL: "https://portal.example.com/" })).toBe(
        "https://portal.example.com",
      );
    });
  });
});
