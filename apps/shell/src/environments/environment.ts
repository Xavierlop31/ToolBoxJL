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
 */
export const environment = {
  production: true,
  supabase: {
    url: 'https://REEMPLAZAR-EN-VERCEL.supabase.co',
    anonKey: 'REEMPLAZAR-CON-SUPABASE-ANON-KEY-DE-PRODUCCION',
  },
};
