/**
 * Entorno de producción (build por defecto de `ng build` / `pnpm build`).
 *
 * PLACEHOLDER — `apiUrl` sigue el mismo patrón que `environment.supabase` en
 * apps/shell (Sprint 0): Backend (apps/api) corre en su propia rama en
 * paralelo (ver PROMPT_IMPLEMENTACION.md, A.7) y todavía no hay una URL de
 * Railway real desplegada. Reemplazar antes de cualquier deploy real —en
 * CI/Vercel inyectar via variables de entorno del proyecto y generar este
 * archivo en un paso de build.
 *
 * `supabase.{url,anonKey}` se agregan en Sprint 9 (HU-10.1/10.2, widget de
 * voz): `core/auth/auth.service.ts` de este remote necesita saber
 * reactivamente si hay un Cliente autenticado (mismo patrón que
 * apps/panel-admin, ver la nota en `core/auth/supabase-client.ts`). Mismos
 * placeholders, misma salvedad de reemplazo antes de deploy real. También
 * hay que declarar `supabase: true` para "portal-cliente" en
 * `scripts/generate-frontend-config.mjs` (ya hecho) para que el paso de
 * prebuild de CI/Vercel los materialice desde `NG_APP_SUPABASE_URL`/
 * `NG_APP_SUPABASE_ANON_KEY`.
 */
export const environment = {
  production: true,
  apiUrl: 'https://REEMPLAZAR-EN-VERCEL-toolboxjl-api.up.railway.app/api/v1',
  supabase: {
    url: 'https://REEMPLAZAR-EN-VERCEL.supabase.co',
    anonKey: 'REEMPLAZAR-CON-SUPABASE-ANON-KEY-DE-PRODUCCION',
  },
};
