import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { extractRolDeSesion } from '@toolboxjl/shared-types';

import { SUPABASE_CLIENT } from '../supabase/supabase-client';
import { Rol } from '../models/users.models';

/**
 * `extractRolDeSesion` (`@toolboxjl/shared-types`) — antes duplicada línea
 * por línea acá y en `apps/shell/src/app/core/auth/auth.service.ts` (causó
 * un Quality Gate de SonarCloud por duplicación de código nuevo); ver el
 * doc-comment de esa función para el detalle del bug de precedencia
 * JWT-vs-`app_metadata` que corrige. `RolHumano` (shared-types) y `Rol`
 * (`../models/users.models`) son el mismo union de 5 strings — compatibles
 * estructuralmente, sin necesidad de cast.
 */
const extractRol = extractRolDeSesion;

/**
 * Lee el rol de la sesión activa (`SUPABASE_CLIENT`, misma sesión que ya
 * inició el usuario vía el cliente de `apps/shell` — ver el doc-comment de
 * `supabase-client.ts`) para filtrar el nav de `AdminShellComponent` por
 * rol (Issue #184-ter — el Gerente solo ve 5 de los 10 ítems).
 *
 * `apps/panel-admin` no tenía ningún servicio de sesión/rol propio hasta
 * ahora (confirmado en el doc-comment de `admin-shell.component.ts`) —
 * mismo patrón de extracción de rol que
 * `apps/shell/src/app/core/auth/auth.service.ts` (`extractRol()`), pero acá
 * solo se necesita el rol, no todo el ciclo de vida de sesión/login/logout
 * (eso lo sigue manejando shell).
 */
@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  private readonly sessionSignal = signal<Session | null>(null);
  private readonly loadedSignal = signal(false);

  readonly userRole = computed<Rol>(() => extractRol(this.sessionSignal()));
  /** `true` una vez resuelta la sesión inicial — evita que el guard de rutas redirija de más mientras `getSession()` todavía está en vuelo. */
  readonly loaded = this.loadedSignal.asReadonly();

  constructor() {
    this.supabase.auth.getSession().then(({ data }) => {
      this.sessionSignal.set(data.session);
      this.loadedSignal.set(true);
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionSignal.set(session);
      this.loadedSignal.set(true);
    });
  }
}
