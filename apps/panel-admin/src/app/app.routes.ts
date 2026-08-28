import { Routes } from '@angular/router';

import { remoteRoutes } from './remote-entry/entry.routes';

/**
 * Rutas para servir panel-admin en modo standalone (`pnpm start`, puerto
 * 4203) — desarrollo local y `webServer` de Playwright
 * (e2e-bdd/playwright.config.ts). Reutilizan las mismas rutas expuestas al
 * shell vía Native Federation — el redirect de `path: ''` ya viene incluido
 * en `remoteRoutes` (entry.routes.ts), no se repite acá.
 */
export const routes: Routes = [
  ...remoteRoutes,
  { path: '**', redirectTo: 'vehiculos/nuevo' },
];

