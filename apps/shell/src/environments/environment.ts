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
 */
export const environment = {
  production: true,
  apiUrl: 'https://REEMPLAZAR-EN-VERCEL-toolboxjl-api.up.railway.app/api/v1',
  supabase: {
    url: 'https://REEMPLAZAR-EN-VERCEL.supabase.co',
    anonKey: 'REEMPLAZAR-CON-SUPABASE-ANON-KEY-DE-PRODUCCION',
  },
};
