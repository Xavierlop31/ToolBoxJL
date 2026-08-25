/**
 * Entorno de producción (build por defecto de `ng build` / `pnpm build`).
 *
 * PLACEHOLDERS — mismo criterio que apps/shell y apps/portal-cliente (ver
 * la nota completa en apps/shell/src/environments/environment.ts). Las
 * credenciales sandbox de Supabase ya existen como GitHub Secrets del repo
 * pero no están disponibles en este entorno de desarrollo del agente de
 * Frontend. Reemplazar antes de cualquier deploy real.
 */
export const environment = {
  production: true,
  apiUrl: 'https://REEMPLAZAR-EN-VERCEL-toolboxjl-api.up.railway.app/api/v1',
  supabase: {
    url: 'https://REEMPLAZAR-EN-VERCEL.supabase.co',
    anonKey: 'REEMPLAZAR-CON-SUPABASE-ANON-KEY-DE-PRODUCCION',
  },
};
