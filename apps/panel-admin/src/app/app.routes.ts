import { Routes } from '@angular/router';

import { remoteRoutes } from './remote-entry/entry.routes';

/**
 * Rutas para servir panel-admin en modo standalone (`pnpm start`, puerto
 * 4203) — desarrollo local y `webServer` de Playwright
 * (e2e-bdd/playwright.config.ts). Reutilizan las mismas rutas expuestas al
 * shell vía Native Federation.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'vehiculos/nuevo' },
  ...remoteRoutes,
  { path: '**', redirectTo: 'vehiculos/nuevo' },
];
