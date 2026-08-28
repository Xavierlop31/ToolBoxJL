import { Routes } from '@angular/router';

import { PortalShellComponent } from './portal-shell.component';

/**
 * Rutas expuestas por Native Federation (`./Routes` en federation.config.js)
 * y montadas por apps/shell vía:
 *
 *   loadRemoteModule({ remoteName: 'portal-cliente', exposedModule: './Routes' })
 *     .then((m) => m.remoteRoutes)
 *
 * Cubren RF-1.1 (visibilidad del catálogo) y RF-1.4 (disponibilidad por
 * rango de fechas) — features/01_catalogo_inventario.feature.
 * `/catalog/search` y `/catalog/models/{id}` son públicos en openapi.yaml
 * (security: []), por lo que estas rutas no llevan `authGuard`.
 *
 * Sprint 9 (HU-10.1/10.2): las páginas quedan anidadas bajo
 * `PortalShellComponent` (path `''`, prefijo vacío — no cambia ninguna URL
 * existente) para que el widget flotante de voz sea visible en cualquier
 * ruta del portal. Es la misma técnica tanto en modo standalone
 * (`app.routes.ts` reutiliza este array) como montado por el shell.
 */
export const remoteRoutes: Routes = [
  {
    path: '',
    component: PortalShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('../features/catalog-search/catalog-search.component').then(
            (m) => m.CatalogSearchComponent,
          ),
        title: 'Catálogo — ToolBox JL',
      },
      {
        path: 'catalogo',
        loadComponent: () =>
          import('../features/catalog-search/catalog-search.component').then(
            (m) => m.CatalogSearchComponent,
          ),
        title: 'Catálogo — ToolBox JL',
      },
      {
        path: ':id',
        loadComponent: () =>
          import('../features/model-detail/model-detail.component').then(
            (m) => m.ModelDetailComponent,
          ),
        title: 'Ficha de modelo — ToolBox JL',
      },
      {
        path: 'catalogo/:id',
        loadComponent: () =>
          import('../features/model-detail/model-detail.component').then(
            (m) => m.ModelDetailComponent,
          ),
        title: 'Ficha de modelo — ToolBox JL',
      },
    ],
  },
];
