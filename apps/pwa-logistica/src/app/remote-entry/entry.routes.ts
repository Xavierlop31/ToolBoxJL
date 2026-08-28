import { Routes } from '@angular/router';

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
 * devolución) — features/05_devoluciones_inspeccion_mora.feature — y,
 * desde Sprint 7, HU-8.2 (Repartidor ve su ruta del día ya optimizada) —
 * features/08_agente_ruteo.feature.
 * `GET /inventory/units/{id}`, `PATCH /inventory/units/{id}/status`,
 * `POST /inspections` y `GET /logistics/my-route` requieren rol
 * almacenista/repartidor (x-roles, openapi.yaml líneas 159-210, 481-504 y
 * 549-589); el shell gatea `/logistica` con `authGuard` (sesión activa). La
 * verificación fina de rol (almacenista/repartidor vs. otros roles
 * autenticados) queda pendiente de que AuthService exponga el rol del
 * usuario (Sprint 0 solo resuelve sesión, no rol) — documentado como
 * decisión de este sprint, no como omisión silenciosa.
 *
 * `inspeccion/:unidadId` no tiene todavía un punto de navegación propio
 * (lista de "envíos por inspeccionar") — no hay Issue de este sprint que lo
 * pida; se navega directo con el `unidadId` de la unidad devuelta.
 *
 * El redirect de `path: ''` vive ACÁ (no solo en `app.routes.ts` standalone)
 * para que también aplique montado por el shell — sin esto, `/logistica`
 * (el link literal que usa `home.component.ts`) no matcheaba ninguna ruta y
 * quedaba en blanco sin error en consola (bug real, testing 2026-08-28).
 */
export const remoteRoutes: Routes = [
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
];
