import { Routes } from '@angular/router';

import { remoteRoutes } from './remote-entry/entry.routes';

/**
 * Rutas para servir portal-cliente en modo standalone (`pnpm start`, puerto
 * 4201) — usadas en desarrollo local y por el `webServer` de Playwright en
 * e2e-bdd/playwright.config.ts. Reutilizan las mismas rutas que se exponen
 * al shell vía Native Federation (remote-entry/entry.routes.ts) para no
 * duplicar el árbol de rutas.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalogo' },
  ...remoteRoutes,
  { path: '**', redirectTo: 'catalogo' },
];
