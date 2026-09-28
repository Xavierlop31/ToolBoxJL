import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../supabase/supabase-client';
import { Rol } from '../models/users.models';

const ROLES_VALIDOS: Rol[] = ['cliente', 'admin', 'gerente', 'almacenista', 'repartidor'];

function esRolValido(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES_VALIDOS as string[]).includes(valor);
}

/**
 * Rol tal como lo dejó `custom_access_token_hook` (migración
 * `20260830120000_custom_access_token_hook`) en `claims.app_metadata.rol`
 * del JWT FIRMADO — se refresca en cada login/refresh de token, a
 * diferencia de `session.user.app_metadata` (ver `extractRol`).
 */
function extractRolDelJwt(accessToken: string | undefined): Rol | null {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    const jwtRol = payload.rol ?? payload.role ?? payload.app_metadata?.rol ?? payload.user_metadata?.rol;
    return esRolValido(jwtRol) ? jwtRol : null;
  } catch {
    return null;
  }
}

/**
 * *** BUG CORREGIDO ***: `session.user.app_metadata`/`user_metadata` NO son
 * el claim del JWT firmado — son la serialización de `auth.users` que
 * GoTrue devuelve junto al token, y ESA columna solo se actualiza cuando
 * algo hace `auth.admin.updateUserById`/`UPDATE auth.users` directamente
 * (el viejo procedimiento manual por SQL). `ActualizarUsuarioUseCase` (Sprint
 * 15, gestión de usuarios) solo actualiza `public.users.rol` — el rol
 * correcto y FRESCO viaja en el JWT vía `custom_access_token_hook`, que sí
 * lee `public.users.rol` en cada login. Por eso acá se decodifica el JWT
 * PRIMERO; `session.user.app_metadata`/`user_metadata` quedan como fallback
 * únicamente para sesiones sin ese claim. Mismo fix que
 * `apps/shell/src/app/core/auth/auth.service.ts` (`extractRol`).
 */
function extractRol(session: Session | null): Rol {
  if (!session?.user) return 'cliente';

  const jwtRol = extractRolDelJwt(session.access_token);
  if (jwtRol) {
    return jwtRol;
  }

  const rawRol =
    session.user.app_metadata?.['rol'] ??
    session.user.user_metadata?.['rol'] ??
    session.user.app_metadata?.['role'] ??
    session.user.user_metadata?.['role'];

  return esRolValido(rawRol) ? rawRol : 'cliente';
}

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
