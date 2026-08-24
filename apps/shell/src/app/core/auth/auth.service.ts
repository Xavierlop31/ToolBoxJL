import { Injectable, computed, inject, signal } from '@angular/core';
import type { AuthError, Session } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from './supabase-client';

export interface AuthResult {
  error: AuthError | null;
}

/**
 * AuthModule del frontend (HU-6.1 — ver features/06_autenticacion_seguridad.feature,
 * primer escenario: login con correo/contraseña o con Google).
 *
 * Envuelve `@supabase/supabase-js` directo desde el cliente — no hay un
 * endpoint propio de `/auth/login` en `openapi.yaml` (confirmado: no existe
 * ninguna ruta `/auth/*` en el contrato) porque el login no pasa por el
 * backend de ToolBox JL, sino directo por Supabase Auth (ver
 * docs/DESIGN.md §3.7). El backend consume el JWT resultante vía
 * `bearerAuth` para las llamadas subsiguientes a la API.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  private readonly sessionSignal = signal<Session | null>(null);
  private readonly sessionLoadedSignal = signal(false);

  /** Sesión activa de Supabase Auth, o `null` si no hay usuario logueado. */
  readonly session = this.sessionSignal.asReadonly();
  /** `true` una vez que se resolvió la sesión inicial (evita parpadeos de guard). */
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

  /** Escenario Gherkin: "inicio sesión con correo y contraseña". */
  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }

  /**
   * Alta de cuenta de Cliente (correo/contraseña). No es parte del
   * escenario Gherkin del Sprint 0 (que asume una cuenta ya existente), pero
   * sí de la tarea de Frontend ("pantalla de login/registro").
   */
  async signUp(email: string, password: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signUp({ email, password });
    return { error };
  }

  /** Escenario Gherkin: "... o con mi cuenta de Google". */
  async signInWithGoogle(): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    return { error };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
