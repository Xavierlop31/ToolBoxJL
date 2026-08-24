import { InjectionToken } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';

/**
 * Cliente de Supabase JS, inyectable en toda la app.
 *
 * Se resuelve con `environment.supabase.{url,anonKey}` (ver
 * `src/environments/environment*.ts` — hoy con placeholders, ver la nota de
 * asunción ahí). Se expone como `InjectionToken` en vez de instanciarse
 * directo dentro de `AuthService` para poder reemplazarlo por un mock en
 * tests de componente/servicio sin tocar red real.
 */
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>(
  'SUPABASE_CLIENT',
  {
    providedIn: 'root',
    factory: () =>
      createClient(environment.supabase.url, environment.supabase.anonKey),
  },
);
