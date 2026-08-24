/**
 * Forma (parcial) del payload de un JWT emitido por Supabase Auth, una vez
 * verificada su firma. Referencia: https://supabase.com/docs/guides/auth/jwts
 *
 * El rol de negocio (uno de los 5 roles de docs/DESIGN.md §4.1) no es un
 * claim nativo de Supabase Auth — se espera que llegue en `app_metadata.rol`
 * (o, como fallback, `user_metadata.rol`), poblado por un Custom Access
 * Token Hook configurado del lado de Supabase a partir de `public.users.rol`
 * (ver nota en supabase-jwt.strategy.ts). Si ese hook todavía no está
 * configurado en el proyecto Supabase real, `VerificarAccesoUseCase` rechaza
 * el token explícitamente en vez de asumir un rol por defecto.
 */
export interface SupabaseJwtPayload {
  /** uuid del usuario — coincide con `auth.uid()` / `USERS.id`. */
  sub: string;
  email?: string;
  /** Rol a nivel Postgres que asigna Supabase Auth (ej. "authenticated"), no el rol de negocio. */
  role?: string;
  aud?: string | string[];
  exp: number;
  iat: number;
  app_metadata?: {
    rol?: unknown;
    [clave: string]: unknown;
  };
  user_metadata?: {
    rol?: unknown;
    [clave: string]: unknown;
  };
  [clave: string]: unknown;
}
