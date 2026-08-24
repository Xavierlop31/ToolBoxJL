import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Protege rutas que requieren sesión de Supabase Auth activa. Redirige a
 * `/login` si no hay sesión — cubre el "Entonces ... obtengo acceso a la
 * plataforma" del escenario Gherkin (el acceso post-login es a rutas
 * guardadas por este guard).
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
