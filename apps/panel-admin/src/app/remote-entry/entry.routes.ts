import { Routes } from '@angular/router';

/**
 * Rutas expuestas por Native Federation (`./Routes` en federation.config.js)
 * y montadas por apps/shell vía:
 *
 *   loadRemoteModule({ remoteName: 'panel-admin', exposedModule: './Routes' })
 *     .then((m) => m.remoteRoutes)
 *
 * Cubren RF-3.1 (Issue #11 — alta de vehículos de la flota) y RF-3.3
 * (Issue #12 — panel de seguimiento de envíos en tiempo real),
 * features/04_logistica_flota.feature. `POST /fleet/vehicles` requiere rol
 * admin y `GET /logistics/shipments` requiere rol gerente/admin (x-roles,
 * openapi.yaml líneas 397-479); el shell gatea `/admin` con `authGuard`
 * (sesión activa). La verificación fina de rol (admin/gerente vs. otros
 * roles autenticados) queda pendiente de que AuthService exponga el rol
 * del usuario (Sprint 0 solo resuelve sesión, no rol) — documentado como
 * decisión de este sprint, no como omisión silenciosa (mismo criterio ya
 * aplicado a la ruta `/logistica` de pwa-logistica).
 */
export const remoteRoutes: Routes = [
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
];
