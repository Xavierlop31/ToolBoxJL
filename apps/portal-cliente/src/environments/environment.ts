/**
 * Entorno de producción (build por defecto de `ng build` / `pnpm build`).
 *
 * PLACEHOLDER — `apiUrl` sigue el mismo patrón que `environment.supabase` en
 * apps/shell (Sprint 0): Backend (apps/api) corre en su propia rama en
 * paralelo (ver PROMPT_IMPLEMENTACION.md, A.7) y todavía no hay una URL de
 * Railway real desplegada. Reemplazar antes de cualquier deploy real —en
 * CI/Vercel inyectar via variables de entorno del proyecto y generar este
 * archivo en un paso de build.
 */
export const environment = {
  production: true,
  apiUrl: 'https://REEMPLAZAR-EN-VERCEL-toolboxjl-api.up.railway.app/api/v1',
};
