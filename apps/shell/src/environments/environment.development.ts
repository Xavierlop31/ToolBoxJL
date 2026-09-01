/**
 * Entorno de desarrollo local (`ng serve`, `pnpm start`).
 *
 * PLACEHOLDERS — ver la nota completa en `environment.ts`. El proyecto
 * Supabase sandbox de ToolBox JL ya existe (Plan de Implementación,
 * prerrequisito 2) pero sus credenciales no están cargadas en este entorno.
 * Un desarrollador con acceso al proyecto Supabase debe reemplazar estos dos
 * valores localmente (idealmente sin commitear el cambio — ver nota abajo)
 * para poder probar el login contra el sandbox real.
 *
 * `apiUrl` apunta al server local de Desarrollo declarado en `openapi.yaml`
 * (Sprint 6, HU-6.2, Issue #18 — mismo criterio que panel-admin).
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  supabase: {
    url: 'https://REEMPLAZAR-EN-LOCAL.supabase.co',
    anonKey: 'REEMPLAZAR-CON-SUPABASE-ANON-KEY-DE-SANDBOX',
  },
  // Acceso rápido por rol (Sprint 12, HU-11.2) — solo visible en desarrollo.
  // Precarga el correo en el form de login existente; el password NO se
  // hardcodea acá (queda vacío) para no meter secretos en el bundle.
  quickAccessDemo: [
    { rol: 'cliente', label: 'Cliente', email: 'demo.cliente@toolboxjl.test' },
    { rol: 'almacenista', label: 'Almacenista', email: 'demo.almacenista@toolboxjl.test' },
    { rol: 'repartidor', label: 'Repartidor', email: 'demo.repartidor@toolboxjl.test' },
    { rol: 'gerente', label: 'Gerente', email: 'demo.gerente@toolboxjl.test' },
    { rol: 'admin', label: 'Admin', email: 'demo.admin@toolboxjl.test' },
  ],
};
