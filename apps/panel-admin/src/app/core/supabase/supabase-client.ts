import { InjectionToken } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

/**
 * Cliente de Supabase JS propio de panel-admin.
 *
 * Decisión de arquitectura (Sprint 4, HU-4.2): `SUPABASE_CLIENT`
 * (apps/shell/src/app/core/auth/supabase-client.ts) vive en apps/shell y
 * NO está expuesto por su federation.config.js — el shell no expone
 * módulos a los remotes, solo al revés. panel-admin no puede importarlo
 * directo, así que declara este mismo `InjectionToken` con su propia
 * instancia de `createClient()`.
 *
 * Es seguro tener múltiples instancias de `createClient()` contra el mismo
 * proyecto: `@supabase/supabase-js` persiste la sesión en `localStorage`
 * bajo una clave por proyecto, así que este cliente lee automáticamente la
 * MISMA sesión que ya inició el usuario vía el cliente de shell. Para que
 * el canal Realtime respete las políticas RLS de `shipments`, hay que
 * autenticarlo explícitamente con `realtime.setAuth(access_token)` antes de
 * suscribirse (ver shipments-panel.component.ts /
 * logistics-realtime.service.ts).
 */
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>(
  'SUPABASE_CLIENT',
  {
    providedIn: 'root',
    factory: () =>
      createClient(environment.supabase.url, environment.supabase.anonKey),
  },
);
