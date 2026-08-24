/**
 * Entorno de desarrollo local (`ng serve`, `pnpm start`).
 *
 * PLACEHOLDERS — ver la nota completa en `environment.ts`. El proyecto
 * Supabase sandbox de ToolBox JL ya existe (Plan de Implementación,
 * prerrequisito 2) pero sus credenciales no están cargadas en este entorno.
 * Un desarrollador con acceso al proyecto Supabase debe reemplazar estos dos
 * valores localmente (idealmente sin commitear el cambio — ver nota abajo)
 * para poder probar el login contra el sandbox real.
 */
export const environment = {
  production: false,
  supabase: {
    url: 'https://REEMPLAZAR-EN-LOCAL.supabase.co',
    anonKey: 'REEMPLAZAR-CON-SUPABASE-ANON-KEY-DE-SANDBOX',
  },
};
