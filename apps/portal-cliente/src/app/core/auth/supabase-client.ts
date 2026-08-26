import { InjectionToken } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

/**
 * Cliente de Supabase JS propio de portal-cliente.
 *
 * Mismo criterio que `apps/panel-admin/src/app/core/supabase/supabase-client.ts`
 * (Sprint 4, HU-4.2): `SUPABASE_CLIENT` vive en apps/shell y no está expuesto
 * por su `federation.config.js` — el shell no expone módulos a los remotes,
 * solo al revés. portal-cliente no puede importarlo directo, así que declara
 * este mismo `InjectionToken` con su propia instancia de `createClient()`.
 *
 * Es seguro tener múltiples instancias de `createClient()` contra el mismo
 * proyecto: `@supabase/supabase-js` persiste la sesión en `localStorage` bajo
 * una clave por proyecto, así que este cliente lee automáticamente la MISMA
 * sesión que ya inició el usuario vía el cliente de shell. Se agrega en
 * Sprint 9 (HU-10.1/10.2, widget de voz) porque `AuthService` de este remote
 * necesita saber si hay un Cliente autenticado para decidir si el widget
 * flotante de voz se muestra o no — antes de este sprint, portal-cliente solo
 * necesitaba el JWT vía `core/auth/auth.interceptor.ts` (lectura directa de
 * localStorage, sin estado reactivo).
 */
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>(
  'SUPABASE_CLIENT',
  {
    providedIn: 'root',
    factory: () =>
      createClient(environment.supabase.url, environment.supabase.anonKey),
  },
);
