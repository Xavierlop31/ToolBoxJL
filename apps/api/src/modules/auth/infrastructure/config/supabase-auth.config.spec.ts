import {
  loadSupabaseAuthConfig,
  validarEnvDeAuth,
} from "./supabase-auth.config";

describe("loadSupabaseAuthConfig", () => {
  it("deriva jwksUri/issuer/audience a partir de SUPABASE_URL", () => {
    const config = loadSupabaseAuthConfig({
      SUPABASE_URL: "https://proyecto.supabase.co",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      jwksUri: "https://proyecto.supabase.co/auth/v1/.well-known/jwks.json",
      issuer: "https://proyecto.supabase.co/auth/v1",
      audience: "authenticated",
    });
  });

  it("recorta una barra final en SUPABASE_URL antes de derivar las URLs", () => {
    const config = loadSupabaseAuthConfig({
      SUPABASE_URL: "https://proyecto.supabase.co/",
    } as NodeJS.ProcessEnv);

    expect(config.jwksUri).toBe(
      "https://proyecto.supabase.co/auth/v1/.well-known/jwks.json",
    );
  });

  it("recorta múltiples barras finales en SUPABASE_URL antes de derivar las URLs", () => {
    const config = loadSupabaseAuthConfig({
      SUPABASE_URL: "https://proyecto.supabase.co///",
    } as NodeJS.ProcessEnv);

    expect(config.jwksUri).toBe(
      "https://proyecto.supabase.co/auth/v1/.well-known/jwks.json",
    );
    expect(config.issuer).toBe("https://proyecto.supabase.co/auth/v1");
  });

  it("usa SUPABASE_JWT_AUDIENCE cuando está definida", () => {
    const config = loadSupabaseAuthConfig({
      SUPABASE_URL: "https://proyecto.supabase.co",
      SUPABASE_JWT_AUDIENCE: "authenticated-custom",
    } as NodeJS.ProcessEnv);

    expect(config.audience).toBe("authenticated-custom");
  });

  it("lanza con mensaje explícito si SUPABASE_URL no está definida", () => {
    expect(() => loadSupabaseAuthConfig({} as NodeJS.ProcessEnv)).toThrow(
      /SUPABASE_URL no está definida/,
    );
  });

  it("lanza con mensaje explícito si SUPABASE_URL está vacía", () => {
    expect(() =>
      loadSupabaseAuthConfig({ SUPABASE_URL: "   " } as NodeJS.ProcessEnv),
    ).toThrow(/SUPABASE_URL no está definida/);
  });

  it("lanza si SUPABASE_URL no es una URL válida", () => {
    expect(() =>
      loadSupabaseAuthConfig({
        SUPABASE_URL: "no-es-una-url",
      } as NodeJS.ProcessEnv),
    ).toThrow(/no es una URL válida/);
  });
});

describe("validarEnvDeAuth", () => {
  it("devuelve el config sin modificar cuando es válido", () => {
    const entrada = { SUPABASE_URL: "https://proyecto.supabase.co" };
    expect(validarEnvDeAuth(entrada)).toBe(entrada);
  });

  it("lanza (para que ConfigModule.forRoot falle el bootstrap) cuando falta SUPABASE_URL", () => {
    expect(() => validarEnvDeAuth({})).toThrow(/SUPABASE_URL no está definida/);
  });
});
