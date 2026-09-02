import { Routes } from '@angular/router';

import { LogisticaShellComponent } from './logistica-shell.component';

/**
 * Rutas expuestas por Native Federation (`./Routes` en federation.config.js)
 * y montadas por apps/shell vía:
 *
 *   loadRemoteModule({ remoteName: 'pwa-logistica', exposedModule: './Routes' })
 *     .then((m) => m.remoteRoutes)
 *
 * Cubren RF-1.2 (el QR es escaneable desde la PWA) y RF-1.3 (cambio de
 * estado de una unidad) — features/01_catalogo_inventario.feature —,
 * desde Sprint 5, RF-4.2 (checklist de inspección al recibir una
 * devolución) — features/05_devoluciones_inspeccion_mora.feature —,
 * desde Sprint 7, HU-8.2 (Repartidor ve su ruta del día ya optimizada) —
 * features/08_agente_ruteo.feature — y, desde Sprint 14 (Fase 3, Épica 13,
 * Issues #147/#148), HU-13.2 (alta de unidad + QR) y HU-13.1 reducido
 * (lista/búsqueda simple de unidades, sin KPIs) —
 * features/13_gestion_inventario_qr.feature.
 */
export const remoteRoutes: Routes = [
  {
    path: '',
    component: LogisticaShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'escanear' },
      {
        path: 'escanear',
        loadComponent: () =>
          import('../features/qr-scanner/qr-scanner.component').then(
            (m) => m.QrScannerComponent,
          ),
        title: 'Escanear QR — ToolBox JL',
      },
      {
        path: 'unidades',
        loadComponent: () =>
          import('../features/unit-list/unit-list.component').then(
            (m) => m.UnitListComponent,
          ),
        title: 'Unidades — ToolBox JL',
      },
      {
        path: 'registrar-unidad',
        loadComponent: () =>
          import('../features/register-unit/register-unit.component').then(
            (m) => m.RegisterUnitComponent,
          ),
        title: 'Registrar Unidad — ToolBox JL',
      },
      {
        path: 'unidades/:id',
        loadComponent: () =>
          import('../features/unit-detail/unit-detail.component').then(
            (m) => m.UnitDetailComponent,
          ),
        title: 'Unidad — ToolBox JL',
      },
      {
        path: 'inspeccion/:unidadId',
        loadComponent: () =>
          import(
            '../features/inspection-checklist/inspection-checklist.component'
          ).then((m) => m.InspectionChecklistComponent),
        title: 'Checklist de inspección — ToolBox JL',
      },
      {
        path: 'mi-ruta',
        loadComponent: () =>
          import('../features/mi-ruta/mi-ruta.component').then(
            (m) => m.MiRutaComponent,
          ),
        title: 'Mi ruta de hoy — ToolBox JL',
      },
    ],
  },
];
