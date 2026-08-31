import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AuthService } from './auth.service';
import { DeviceIdService } from './device-id.service';
import { DeviceVerificationService } from './device-verification.service';

/**
 * Protege rutas que requieren sesión de Supabase Auth activa. Redirige a
 * `/login` si no hay sesión — cubre el "Entonces ... obtengo acceso a la
 * plataforma" del primer escenario Gherkin (el acceso post-login es a
 * rutas guardadas por este guard).
 *
 * Sprint 6 (HU-6.2, Issue #18) agrega la segunda parte del gate: con
 * sesión activa pero dispositivo NO verificado por OTP de WhatsApp,
 * redirige a `/verificar-dispositivo` en vez de dejar pasar — "mi acceso
 * queda bloqueado hasta que ingrese el OTP correcto antes de que expire".
 * Este bloqueo de TODAS las rutas protegidas es responsabilidad del
 * Frontend (decisión de alcance del Tech Lead, ver el brief del Issue
 * #18): el backend no expone un guard propio que bloquee el resto de la
 * API hasta la verificación de dispositivo.
 *
 * Espera a `auth.sessionLoaded()` antes de decidir (`toObservable` +
 * `filter`/`take(1)`) — `AuthService.session()` se resuelve de forma
 * ASÍNCRONA (`getSession().then(...)` en el constructor); leerlo de forma
 * síncrona acá corría el riesgo de ver `null` todavía en el primer
 * `NavigationStart` y redirigir a `/login` a un usuario con sesión válida
 * (bug preexistente del guard original de Sprint 0, que declaraba
 * `sessionLoaded` en `AuthService` para "evitar parpadeos de guard" pero
 * nunca lo usaba — encontrado al conectar el escenario Gherkin de HU-6.2 a
 * Playwright-BDD, donde la carrera se manifestaba de forma determinística).
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const deviceVerification = inject(DeviceVerificationService);
  const deviceId = inject(DeviceIdService);
  const router = inject(Router);

  return toObservable(auth.sessionLoaded).pipe(
    filter((loaded) => loaded),
    take(1),
    map(() => {
      const session = auth.session();
      if (!session) {
        return router.createUrlTree(['/login']);
      }

      if (!deviceVerification.isVerified(session.user.id, deviceId.deviceId)) {
        return router.createUrlTree(['/verificar-dispositivo']);
      }

      return true;
    }),
  );
};

/**
 * Guard inverso de `authGuard`: protege `/login` de un usuario que YA tiene
 * sesión activa. Sin esto, el login por Google quedaba roto en la práctica
 * (bug real, testing 2026-08-28): `signInWithGoogle()` redirige a
 * `window.location.origin` (la raíz, sin path) — y `path: ''` en
 * `app.routes.ts` manda esa raíz a `/login` incondicionalmente. Supabase SÍ
 * establecía la sesión bien (el usuario se creaba en Supabase Auth y en
 * `public.users`), pero nada sacaba a la persona de `/login` después: veía
 * la misma pantalla de siempre y parecía que el login nunca había
 * funcionado. Misma espera de `sessionLoaded` que el resto de los guards,
 * para no decidir con `auth.session()` todavía sin resolver.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const deviceVerification = inject(DeviceVerificationService);
  const deviceId = inject(DeviceIdService);
  const router = inject(Router);

  return toObservable(auth.sessionLoaded).pipe(
    filter((loaded) => loaded),
    take(1),
    map(() => {
      const session = auth.session();
      if (!session) {
        return true;
      }

      if (!deviceVerification.isVerified(session.user.id, deviceId.deviceId)) {
        return router.createUrlTree(['/verificar-dispositivo']);
      }

      return router.createUrlTree(['/home']);
    }),
  );
};

/**
 * Guard más liviano que `authGuard`: solo exige sesión activa, sin exigir
 * dispositivo verificado. Usado exclusivamente por la ruta
 * `/verificar-dispositivo` — si `authGuard` se usara ahí, un dispositivo no
 * verificado nunca podría llegar a la pantalla que lo verifica (loop de
 * redirección contra sí misma). También espera `sessionLoaded` por el mismo
 * motivo que `authGuard`.
 */
export const sessionGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.sessionLoaded).pipe(
    filter((loaded) => loaded),
    take(1),
    map(() => (auth.isAuthenticated() ? true : router.createUrlTree(['/login']))),
  );
};

/**
 * Guard de RBAC para el módulo de Administración (/admin).
 * Permite acceso únicamente a usuarios con rol `admin` o `gerente`.
 * Si el usuario autenticado tiene otro rol (ej. `cliente`), redirige a `/home`.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.sessionLoaded).pipe(
    filter((loaded) => loaded),
    take(1),
    map(() => {
      if (!auth.isAuthenticated()) {
        return router.createUrlTree(['/login']);
      }
      return auth.isAdminOrGerente() ? true : router.createUrlTree(['/home']);
    }),
  );
};

/**
 * Guard de RBAC para el módulo de Logística (/logistica).
 * Permite acceso a `almacenista`, `repartidor`, `admin` y `gerente`.
 * Si el usuario autenticado es `cliente`, redirige a `/home`.
 */
export const logisticaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.sessionLoaded).pipe(
    filter((loaded) => loaded),
    take(1),
    map(() => {
      if (!auth.isAuthenticated()) {
        return router.createUrlTree(['/login']);
      }
      return auth.isLogistica() ? true : router.createUrlTree(['/home']);
    }),
  );
};

