import { loadRemoteModule } from '@angular-architects/native-federation';
import { Routes } from '@angular/router';

import {
  adminGuard,
  authGuard,
  guestGuard,
  logisticaGuard,
  sessionGuard,
} from './core/auth/auth.guard';

export const routes: Routes = [
  {
    // `guestGuard`: sin esto, volver de un login por Google (que redirige a
    // la raíz, sin path — ver signInWithGoogle en auth.service.ts) dejaba a
    // la persona mirando esta misma pantalla de nuevo, aunque la sesión ya
    // estuviera creada del lado de Supabase (bug real, testing 2026-08-28).
    // Ver la nota completa en core/auth/auth.guard.ts.
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
    title: 'Iniciar sesión — ToolBox JL',
  },
  {
    // HU-6.2 (Issue #18) — verificación por OTP de WhatsApp en dispositivo
    // nuevo. Usa `sessionGuard` (solo exige sesión activa) y NO `authGuard`
    // (que además exige dispositivo verificado): si usara `authGuard`, un
    // dispositivo no verificado nunca podría llegar a la pantalla que lo
    // verifica. Ver la nota completa en `core/auth/auth.guard.ts`.
    path: 'verificar-dispositivo',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./features/auth/otp-verify/otp-verify.component').then(
        (m) => m.OtpVerifyComponent,
      ),
    title: 'Verificá tu dispositivo — ToolBox JL',
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'ToolBox JL',
  },
  {
    // Remote pwa-logistica (Sprint 1, Issues #1-#4 — RF-1.2/RF-1.3).
    // `GET /inventory/units/{id}` y `PATCH .../status` requieren rol
    // almacenista/repartidor/admin/gerente (x-roles); protegido por `authGuard`
    // y `logisticaGuard` (RBAC).
    path: 'logistica',
    canActivate: [authGuard, logisticaGuard],
    loadChildren: () =>
      loadRemoteModule({
        remoteName: 'pwa-logistica',
        exposedModule: './Routes',
      }).then((m) => m.remoteRoutes),
  },
  {
    // Remote panel-admin (Sprint 4, Issues #11-#12 — RF-3.1/RF-3.3).
    // `POST /fleet/vehicles` requiere rol admin y `GET /logistics/shipments`
    // requiere rol gerente/admin (x-roles); protegido por `authGuard` y
    // `adminGuard` (RBAC).
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () =>
      loadRemoteModule({
        remoteName: 'panel-admin',
        exposedModule: './Routes',
      }).then((m) => m.remoteRoutes),
  },
  {
    // Remote portal-cliente (Sprint 1, Issues #1-#4 — RF-1.1/RF-1.4).
    // `/catalog/search` y `/catalog/models/{id}` son públicos en
    // openapi.yaml (security: []), por eso esta ruta no lleva `authGuard`:
    // cualquier visitante puede navegar el catálogo sin sesión.
    //
    // `path: ''`, NO `path: 'catalogo'`: `remoteRoutes` (entry.routes.ts de
    // portal-cliente) ya envuelve sus páginas bajo un `path: ''` propio con
    // `catalogo`/`catalogo/:id` como hijos — es la misma técnica que usa su
    // `app.routes.ts` en modo standalone (`...remoteRoutes` en la raíz, ver
    // el comentario de entry.routes.ts). Montarlo acá con `path: 'catalogo'`
    // exigiría `/catalogo/catalogo` en vez de `/catalogo` — bug real
    // detectado en testing 2026-08-28 (la página quedaba en blanco, sin
    // error en consola, porque ninguna ruta matcheaba).
    //
    // Se ubica al final del array (antes del wildcard), no junto a
    // `/logistica`/`/admin`: como `loadChildren` de un `path: ''` intenta
    // resolverse para CUALQUIER URL que llegue hasta acá (matching por
    // prefijo vacío), dejarlo último evita que una navegación a
    // `/logistica` o `/admin` dispare de arriba una carga innecesaria del
    // remote de portal-cliente antes de hacer backtracking.
    path: '',
    loadChildren: () =>
      loadRemoteModule({
        remoteName: 'portal-cliente',
        exposedModule: './Routes',
      }).then((m) => m.remoteRoutes),
  },
  { path: '**', redirectTo: 'login' },
];
