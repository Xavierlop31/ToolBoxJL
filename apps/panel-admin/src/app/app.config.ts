import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

/**
 * Sin interceptor propio ni Service Worker: panel-admin no es offline-first
 * (esa es una decisión explícita solo para apps/pwa-logistica, ver
 * docs/DESIGN.md). `provideHttpClient()` alcanza para correr standalone
 * (`ng serve`, BDD local) — el interceptor real de auth
 * (apps/shell/src/app/core/auth/auth.interceptor.ts) ya se aplica
 * automáticamente cuando este remote corre federado dentro del shell
 * (comparten el root injector), que es como corre en producción.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
  ],
};
