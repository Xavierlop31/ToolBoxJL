import { Injectable, computed, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from './supabase-client';

/**
 * Estado de sesión de Supabase Auth, propio de portal-cliente.
 *
 * A diferencia de `apps/shell/src/app/core/auth/auth.service.ts` (que
 * implementa el login/registro completo, HU-6.1), este servicio es
 * deliberadamente de solo lectura: portal-cliente nunca muestra pantallas de
 * login/registro (eso vive en el shell) — solo necesita saber, reactivamente,
 * si hay un Cliente autenticado para decidir si mostrar el widget flotante de
 * voz (HU-10.1/10.2, Sprint 9) u otra UI condicionada a sesión a futuro. Lee
 * la MISMA sesión de `localStorage` que ya inició el usuario vía el cliente
 * de Supabase de apps/shell (ver la nota en `supabase-client.ts`).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  private readonly sessionSignal = signal<Session | null>(null);
  private readonly sessionLoadedSignal = signal(false);

  /** Sesión activa de Supabase Auth, o `null` si no hay Cliente logueado. */
  readonly session = this.sessionSignal.asReadonly();
  /** `true` una vez que se resolvió la sesión inicial (evita parpadeos del widget). */
  readonly sessionLoaded = this.sessionLoadedSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);

  constructor() {
    this.supabase.auth.getSession().then(({ data }) => {
      this.sessionSignal.set(data.session);
      this.sessionLoadedSignal.set(true);
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionSignal.set(session);
      this.sessionLoadedSignal.set(true);
    });
  }
}
