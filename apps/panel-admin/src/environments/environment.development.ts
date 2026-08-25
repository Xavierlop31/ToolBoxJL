/**
 * Entorno de desarrollo local (`ng serve`, `pnpm start`).
 *
 * `apiUrl` apunta al server local de Desarrollo declarado en
 * `openapi.yaml`. `supabase.{url,anonKey}` son PLACEHOLDERS (ver la nota
 * completa en apps/shell/src/environments/environment.development.ts) — un
 * desarrollador con acceso al proyecto Supabase sandbox debe reemplazarlos
 * localmente para probar la suscripción Realtime contra el sandbox real.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  supabase: {
    url: 'https://REEMPLAZAR-EN-LOCAL.supabase.co',
    anonKey: 'REEMPLAZAR-CON-SUPABASE-ANON-KEY-DE-SANDBOX',
  },
};
