/**
 * Configuración derivada del entorno para verificar JWTs de Supabase Auth.
 *
 * Supabase Auth firma sus JWT de forma asimétrica (ES256/RS256) y publica
 * las claves públicas en un endpoint JWKS estándar por proyecto —
 * `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Verificar contra JWKS
 * (en vez de un JWT secret compartido) es el approach recomendado por
 * Supabase: no requiere distribuir ningún secreto al backend, solo la URL
 * pública del proyecto.
 */
export interface SupabaseAuthConfig {
  readonly jwksUri: string;
  readonly issuer: string;
  readonly audience: string;
}

/**
 * Lee y valida las variables de entorno necesarias para `SupabaseAuthConfig`.
 * Lanza con un mensaje explícito si `SUPABASE_URL` falta o es inválida —
 * ninguna corrida de la API debe arrancar en un estado donde el AuthModule
 * "funcione" sin poder verificar tokens de verdad.
 *
 * Recibe el objeto de entorno explícitamente (en vez de leer `process.env`
 * directamente) para poder testearla con fixtures sin tocar el proceso real.
 */
export function loadSupabaseAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseAuthConfig {
  const supabaseUrlCruda = env.SUPABASE_URL?.trim();
  if (!supabaseUrlCruda) {
    throw new Error(
      "SUPABASE_URL no está definida. AuthModule no puede verificar JWTs de " +
        "Supabase Auth sin la URL del proyecto (necesaria para resolver el " +
        "endpoint JWKS). Definila en el entorno — ver apps/api/.env.example.",
    );
  }

  let supabaseUrl: URL;
  try {
    supabaseUrl = new URL(supabaseUrlCruda);
  } catch {
    throw new Error(
      `SUPABASE_URL no es una URL válida: "${supabaseUrlCruda}".`,
    );
  }

  const base = supabaseUrl.toString().replace(/\/+$/, "");
  const audience = env.SUPABASE_JWT_AUDIENCE?.trim() || "authenticated";

  return {
    jwksUri: `${base}/auth/v1/.well-known/jwks.json`,
    issuer: `${base}/auth/v1`,
    audience,
  };
}

/**
 * Validación a usar como `validate` de `ConfigModule.forRoot` en AppModule:
 * falla el bootstrap temprano (antes de instanciar ningún provider del
 * AuthModule) si el entorno no alcanza para verificar JWTs.
 */
export function validarEnvDeAuth(
  config: Record<string, unknown>,
): Record<string, unknown> {
  // Reusa la misma validación de loadSupabaseAuthConfig contra el config
  // recibido por @nestjs/config (que no siempre es exactamente process.env).
  loadSupabaseAuthConfig(config as NodeJS.ProcessEnv);
  return config;
}
