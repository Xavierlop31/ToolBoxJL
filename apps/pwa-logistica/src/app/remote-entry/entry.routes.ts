import { Routes } from '@angular/router';

/**
 * Rutas expuestas por Native Federation (`./Routes` en federation.config.js)
 * y montadas por apps/shell vía:
 *
 *   loadRemoteModule({ remoteName: 'pwa-logistica', exposedModule: './Routes' })
 *     .then((m) => m.remoteRoutes)
 *
 * Cubren RF-1.2 (el QR es escaneable desde la PWA) y RF-1.3 (cambio de
 * estado de una unidad) — features/01_catalogo_inventario.feature — y,
 * desde Sprint 5, RF-4.2 (checklist de inspección al recibir una
 * devolución) — features/05_devoluciones_inspeccion_mora.feature.
 * `GET /inventory/units/{id}`, `PATCH /inventory/units/{id}/status` y
 * `POST /inspections` requieren rol almacenista/repartidor (x-roles,
 * openapi.yaml líneas 159-210 y 481-504); el shell gatea `/logistica` con
 * `authGuard` (sesión activa). La verificación fina de rol
 * (almacenista/repartidor vs. otros roles autenticados) queda pendiente de
 * que AuthService exponga el rol del usuario (Sprint 0 solo resuelve
 * sesión, no rol) — documentado como decisión de este sprint, no como
 * omisión silenciosa.
 *
 * `inspeccion/:unidadId` no tiene todavía un punto de navegación propio
 * (lista de "envíos por inspeccionar") — no hay Issue de este sprint que lo
 * pida; se navega directo con el `unidadId` de la unidad devuelta.
 */
export const remoteRoutes: Routes = [
  {
    path: 'escanear',
    loadComponent: () =>
      import('../features/qr-scanner/qr-scanner.component').then(
        (m) => m.QrScannerComponent,
      ),
    title: 'Escanear QR — ToolBox JL',
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
];
