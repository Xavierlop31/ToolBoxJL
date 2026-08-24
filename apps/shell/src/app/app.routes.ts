import { loadRemoteModule } from '@angular-architects/native-federation';
import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
    title: 'Iniciar sesión — ToolBox JL',
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'ToolBox JL',
  },
  {
    // Remote portal-cliente (Sprint 1, Issues #1-#4 — RF-1.1/RF-1.4).
    // `/catalog/search` y `/catalog/models/{id}` son públicos en
    // openapi.yaml (security: []), por eso esta ruta no lleva `authGuard`:
    // cualquier visitante puede navegar el catálogo sin sesión.
    path: 'catalogo',
    loadChildren: () =>
      loadRemoteModule({
        remoteName: 'portal-cliente',
        exposedModule: './Routes',
      }).then((m) => m.remoteRoutes),
  },
  {
    // Remote pwa-logistica (Sprint 1, Issues #1-#4 — RF-1.2/RF-1.3).
    // `GET /inventory/units/{id}` y `PATCH .../status` requieren rol
    // almacenista/repartidor (x-roles); acá solo gateamos sesión activa
    // (`authGuard`) porque AuthService todavía no expone el rol del
    // usuario (Sprint 0 solo resuelve sesión) — la verificación fina de rol
    // queda pendiente, documentada, para un sprint posterior de hardening.
    path: 'logistica',
    canActivate: [authGuard],
    loadChildren: () =>
      loadRemoteModule({
        remoteName: 'pwa-logistica',
        exposedModule: './Routes',
      }).then((m) => m.remoteRoutes),
  },
  { path: '**', redirectTo: 'login' },
];
