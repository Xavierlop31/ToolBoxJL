import { Routes } from '@angular/router';

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
 */
export const remoteRoutes: Routes = [
  {
    path: 'catalogo',
    loadComponent: () =>
      import('../features/catalog-search/catalog-search.component').then(
        (m) => m.CatalogSearchComponent,
      ),
    title: 'Catálogo — ToolBox JL',
  },
  {
    path: 'catalogo/:id',
    loadComponent: () =>
      import('../features/model-detail/model-detail.component').then(
        (m) => m.ModelDetailComponent,
      ),
    title: 'Ficha de modelo — ToolBox JL',
  },
];
