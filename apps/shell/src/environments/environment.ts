/**
 * Entorno de producción (build por defecto de `ng build` / `pnpm build`).
 *
 * PLACEHOLDERS — no son credenciales reales. Las credenciales sandbox de
 * Supabase (Plan de Implementación, prerrequisito 2) ya existen como GitHub
 * Secrets del repo, pero no están disponibles en este entorno de desarrollo
 * del agente de Frontend. Reemplazar antes de cualquier deploy real:
 *
 * - En CI/Vercel: inyectar via variables de entorno del proyecto Vercel y
 *   generar este archivo en un paso de build (o migrar a
 *   `import.meta.env` si se adopta un enfoque tipo Vite/esbuild define).
 * - En local: no commitear valores reales; usar `environment.local.ts`
 *   (gitignored) o variables de entorno del shell si el equipo lo decide.
 *
 * `apiUrl` se agrega en Sprint 6 (HU-6.2, Issue #18): el shell ahora llama
 * directo a `POST /auth/otp/request` y `POST /auth/otp/verify` (backend
 * NestJS), mismo criterio que `apiUrl` en panel-admin/portal-cliente/
 * pwa-logistica.
 *
 * Nota 2026-08-28: rotar `NG_APP_SUPABASE_ANON_KEY` en Vercel no alcanza
 * por sí solo — el valor queda horneado en este archivo en build-time
 * (ver `scripts/generate-frontend-config.mjs`), así que además hace falta
 * un build nuevo. Un "Redeploy" sobre un deployment existente reutiliza el
 * bundle ya compilado (falla con "no usarán las variables de entorno más
 * recientes"), y un commit vacío tampoco sirve: Vercel detecta que no
 * afecta a `apps/shell` y lo saltea (mismo criterio que las apps que
 * aparecen "Skipped - Not affected" en los checks de PRs que no las
 * tocan). Hace falta un cambio real en un archivo de `apps/shell`.
 */
export const environment = {
  production: true,
  apiUrl: 'https://REEMPLAZAR-EN-VERCEL-toolboxjl-api.up.railway.app/api/v1',
  supabase: {
    url: 'https://REEMPLAZAR-EN-VERCEL.supabase.co',
    anonKey: 'REEMPLAZAR-CON-SUPABASE-ANON-KEY-DE-PRODUCCION',
  },
  // El acceso rápido por rol (Sprint 12, HU-11.2) es solo de desarrollo —
  // en producción queda vacío a propósito, ver environment.development.ts.
  quickAccessDemo: [] as ReadonlyArray<{ rol: string; label: string; email: string }>,
};
