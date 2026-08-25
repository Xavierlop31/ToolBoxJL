import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from './auth.service';

/**
 * Adjunta el JWT de la sesión de Supabase Auth (vía `AuthService.session`,
 * ya resuelto de forma sincrónica una vez cargado — ver auth.service.ts) a
 * cada request saliente hacia la API. Registrado en `app.config.ts` del
 * shell (no de cada remote): los remotes federados (portal-cliente,
 * pwa-logistica) montan sus rutas en el árbol de inyección del shell, así
 * que un interceptor definido ahí es el único que efectivamente corre
 * cuando la app real está federada — un `provideHttpClient` en el
 * `app.config.ts` de un remote solo aplica cuando ese remote corre
 * standalone (`ng serve` local para BDD).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.session()?.access_token;

  if (token) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }

  return next(req);
};
