import { Injectable, computed, inject, signal } from '@angular/core';
import type { AuthError, Session } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from './supabase-client';

export interface AuthResult {
  error: AuthError | null;
}

export type Rol = 'cliente' | 'admin' | 'gerente' | 'almacenista' | 'repartidor';

function extractRol(session: Session | null): Rol {
  if (!session?.user) return 'cliente';

  const rawRol =
    session.user.app_metadata?.['rol'] ??
    session.user.user_metadata?.['rol'] ??
    session.user.app_metadata?.['role'] ??
    session.user.user_metadata?.['role'];

  if (typeof rawRol === 'string' && ['cliente', 'admin', 'gerente', 'almacenista', 'repartidor'].includes(rawRol)) {
    return rawRol as Rol;
  }

  if (session.access_token) {
    try {
      const parts = session.access_token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const jwtRol = payload.rol ?? payload.role ?? payload.app_metadata?.rol ?? payload.user_metadata?.rol;
        if (typeof jwtRol === 'string' && ['cliente', 'admin', 'gerente', 'almacenista', 'repartidor'].includes(jwtRol)) {
          return jwtRol as Rol;
        }
      }
    } catch {
      // ignore
    }
  }

  return 'cliente';
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
  readonly userRole = computed<Rol>(() => extractRol(this.sessionSignal()));
  readonly isCliente = computed(() => this.userRole() === 'cliente');
  readonly isAdminOrGerente = computed(() => ['admin', 'gerente'].includes(this.userRole()));
  readonly isLogistica = computed(() => ['almacenista', 'repartidor', 'admin', 'gerente'].includes(this.userRole()));
  readonly userRoleDisplay = computed(() => {
    switch (this.userRole()) {
      case 'admin': return 'Administrador';
      case 'gerente': return 'Gerente';
      case 'almacenista': return 'Almacenista';
      case 'repartidor': return 'Repartidor';
      case 'cliente':
      default:
        return 'Cliente';
    }
  });

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
  /**
   * `emailRedirectTo` explícito (mismo criterio que `signInWithGoogle`): sin
   * esto, el link del correo de confirmación cae al "Site URL" global del
   * proyecto de Supabase — que apuntaba al default `http://localhost:3000`
   * en producción hasta que se corrigió a mano en el dashboard. Pasarlo acá
   * hace que el link siempre apunte al origin desde el que se registró el
   * usuario (producción o un preview de Vercel), sin depender de que ese
   * campo del dashboard esté bien seteado.
   */
  async signUp(email: string, password: string, telefono: string): Promise<AuthResult> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        // HU-6.2: el OTP de WhatsApp se envía al telefono guardado en
        // user_metadata — VerificarAccesoUseCase y WhatsAppReminderJob ya
        // lo leen desde ahí, así que no requiere ningún cambio de backend.
        data: { telefono },
      },
    });
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
