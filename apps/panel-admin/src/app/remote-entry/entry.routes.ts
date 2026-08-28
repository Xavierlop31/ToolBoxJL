import { Routes } from '@angular/router';

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
 * #20 — ROI por herramienta) y HU-7.3 (Issue #21 — utilización de
 * inventario y productividad de repartidores),
 * features/04_logistica_flota.feature y features/07_kpis_analitica.feature.
 * `POST /fleet/vehicles` requiere rol admin, `GET /logistics/shipments`,
 * `GET /analytics/revenue`, `GET /analytics/roi`, `GET
 * /analytics/utilization` y `GET /analytics/delivery-productivity`
 * requieren rol gerente/admin (x-roles, openapi.yaml líneas 397-479,
 * 850-950); el shell gatea `/admin` con `authGuard` (sesión activa). La
 * verificación fina de rol (admin/gerente vs. otros roles autenticados)
 * queda pendiente de que AuthService exponga el rol del usuario (Sprint 0
 * solo resuelve sesión, no rol) — documentado como decisión de este
 * sprint, no como omisión silenciosa (mismo criterio ya aplicado a la
 * El redirect de `path: ''` vive ACÁ (no solo en `app.routes.ts` standalone)
 * para que también aplique montado por el shell — sin esto, `/admin`
 * (el link literal que usa `home.component.ts`) no matcheaba ninguna ruta y
 * quedaba en blanco sin error en consola (mismo bug corregido en PR #114
 * para pwa-logistica y portal-cliente).
 */
export const remoteRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'vehiculos/nuevo' },
  {
    path: 'vehiculos/nuevo',
    loadComponent: () =>
      import('../features/vehicle-registration/vehicle-registration.component').then(
        (m) => m.VehicleRegistrationComponent,
      ),
    title: 'Registrar vehículo — ToolBox JL',
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
    path: 'utilizacion-productividad',
    loadComponent: () =>
      import(
        '../features/utilization-productivity-dashboard/utilization-productivity-dashboard.component'
      ).then((m) => m.UtilizationProductivityDashboardComponent),
    title: 'Utilización y productividad — ToolBox JL',
  },
];
