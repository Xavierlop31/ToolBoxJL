/**
 * Entorno de desarrollo local (`ng serve`, `pnpm start`).
 *
 * Apunta al server local de Desarrollo declarado en `openapi.yaml`
 * (`http://localhost:3000/api/v1`). apps/api corre en paralelo en su propia
 * rama (feature/backend-catalog-inventory) — no hace falta que esté levantado
 * para desarrollar el frontend: los tests unitarios mockean HttpClient con
 * HttpTestingController y los tests BDD (e2e-bdd/) interceptan la red con
 * `page.route`.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  // Sprint 9 (HU-10.1/10.2) — ver la nota completa en environment.ts.
  // PLACEHOLDER: un desarrollador con acceso al proyecto Supabase sandbox
  // debe reemplazarlo localmente para probar `AuthService` (widget de voz)
  // contra una sesión real; los tests unitarios/BDD no lo necesitan (mockean
  // `SUPABASE_CLIENT`/`AuthService` directo).
  supabase: {
    url: 'https://REEMPLAZAR-EN-LOCAL.supabase.co',
    anonKey: 'REEMPLAZAR-CON-SUPABASE-ANON-KEY-DE-SANDBOX',
  },
};
