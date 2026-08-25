import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

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
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const deviceVerification = inject(DeviceVerificationService);
  const deviceId = inject(DeviceIdService);
  const router = inject(Router);

  const session = auth.session();
  if (!session) {
    return router.createUrlTree(['/login']);
  }

  if (!deviceVerification.isVerified(session.user.id, deviceId.deviceId)) {
    return router.createUrlTree(['/verificar-dispositivo']);
  }

  return true;
};

/**
 * Guard más liviano que `authGuard`: solo exige sesión activa, sin exigir
 * dispositivo verificado. Usado exclusivamente por la ruta
 * `/verificar-dispositivo` — si `authGuard` se usara ahí, un dispositivo no
 * verificado nunca podría llegar a la pantalla que lo verifica (loop de
 * redirección contra sí misma).
 */
export const sessionGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
