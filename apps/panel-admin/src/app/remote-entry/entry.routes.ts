import { Routes } from '@angular/router';

import { AdminShellComponent } from './admin-shell.component';

/**
 * Rutas expuestas por Native Federation (`./Routes` en federation.config.js)
 * y montadas por apps/shell vía:
 *
 *   loadRemoteModule({ remoteName: 'panel-admin', exposedModule: './Routes' })
 *     .then((m) => m.remoteRoutes)
 *
 * Cubren RF-3.1 (Issue #11 — alta de vehículos de la flota), RF-3.3
 * (Issue #12 — panel de seguimiento de envíos en tiempo real), HU-7.1
 * (Issue #19 — dashboard de ingresos totales desglosados), HU-7.2 (Issue
 * #20 — ROI por herramienta), HU-7.3 (Issue #21 — utilización de
 * inventario y productividad de repartidores), HU-13.1 a HU-13.4 (Issues
 * #147-#150, Sprint 14 — panel de Gestión de Inventario QR) y HU-15.1
 * (Issue #153, Sprint 15, Fase 3, Épica 15 — dashboard ejecutivo
 * consolidado, diseño Stitch "Dashboard KPIs - Rediseño Gerencial"). El PRD
 * llama "/logistica/inventario" al panel de inventario; acá se monta como
 * `inventario` bajo `/admin`, mismo patrón plano que el resto de las
 * pestañas de este remote.
 *
 * `dashboard-kpis` es ahora la landing por defecto de `/admin` (antes
 * `ingresos`) — refleja que el mockup de Stitch la muestra como la pestaña
 * "Dashboard" activa/principal del Panel Gerencial (HU-15.1).
 */
export const remoteRoutes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard-kpis' },
      {
        path: 'dashboard-kpis',
        loadComponent: () =>
          import('../features/dashboard-kpis/dashboard-kpis.component').then(
            (m) => m.DashboardKpisComponent,
          ),
        title: 'Dashboard Gerencial — ToolBox JL',
      },
      {
        path: 'ingresos',
        loadComponent: () =>
          import('../features/revenue-dashboard/revenue-dashboard.component').then(
            (m) => m.RevenueDashboardComponent,
          ),
        title: 'Dashboard de ingresos — ToolBox JL',
      },
      {
        path: 'roi',
        loadComponent: () =>
          import('../features/roi-dashboard/roi-dashboard.component').then(
            (m) => m.RoiDashboardComponent,
          ),
        title: 'Dashboard de ROI — ToolBox JL',
      },
      {
        path: 'envios',
        loadComponent: () =>
          import('../features/shipments-panel/shipments-panel.component').then(
            (m) => m.ShipmentsPanelComponent,
          ),
        title: 'Panel de envíos — ToolBox JL',
      },
      {
        path: 'utilizacion-productividad',
        loadComponent: () =>
          import(
            '../features/utilization-productivity-dashboard/utilization-productivity-dashboard.component'
          ).then((m) => m.UtilizationProductivityDashboardComponent),
        title: 'Utilización y productividad — ToolBox JL',
      },
      {
        path: 'vehiculos/nuevo',
        loadComponent: () =>
          import('../features/vehicle-registration/vehicle-registration.component').then(
            (m) => m.VehicleRegistrationComponent,
          ),
        title: 'Registrar vehículo — ToolBox JL',
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('../features/inventory-panel/inventory-panel.component').then(
            (m) => m.InventoryPanelComponent,
          ),
        title: 'Inventario QR — ToolBox JL',
      },
    ],
  },
];
