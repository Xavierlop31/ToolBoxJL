import { Routes } from '@angular/router';

import { remoteRoutes } from './remote-entry/entry.routes';

/**
 * Rutas para servir pwa-logistica en modo standalone (`pnpm start`, puerto
 * 4202) — desarrollo local y `webServer` de Playwright
 * (e2e-bdd/playwright.config.ts). Reutilizan las mismas rutas expuestas al
 * shell vía Native Federation — el redirect de `path: ''` ya viene incluido
 * en `remoteRoutes` (entry.routes.ts), no se repite acá.
 *
 * Nota 2026-08-28: el fix del redirect de arriba (Issue #113) quedó
 * mergeado a `main` pero Vercel nunca llegó a buildearlo — la cuota de
 * builds del plan Hobby se agotó ese mismo día (ver también la nota de
 * `apps/shell/src/environments/environment.ts` sobre por qué un commit
 * vacío no alcanza para forzar un build en un monorepo). Recién tomó el
 * fix tras subir a Vercel Pro.
 */
export const routes: Routes = [
  ...remoteRoutes,
  { path: '**', redirectTo: 'escanear' },
];
