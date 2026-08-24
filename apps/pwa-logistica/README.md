# apps/pwa-logistica

Remote Angular de ToolBox JL (Almacenista/Repartidor), montado por
`apps/shell` vía Native Federation en la ruta `/logistica`. Ver
`docs/DESIGN.md` §2, §3.1 y §8 ("Offline capability").

Cubre RF-1.2 (el QR es escaneable desde la PWA) y RF-1.3 (cambio de estado
de una unidad) — `features/01_catalogo_inventario.feature`, Issues #1-#4
(Sprint 1).

## Alcance de este sprint

- Escaneo de QR (`features/qr-scanner/`) → resuelve a
  `GET /inventory/units/{id}` (RF-1.2).
- Cambio de estado (`features/unit-detail/`) → `PATCH
  /inventory/units/{id}/status`, con los 5 estados del enum
  (`Nuevo | Excelente | Operativo | En Mantenimiento | Dado de Baja`) y
  carga opcional de fotos (RF-1.3).

**Fuera de alcance (decisión del Tech Lead):** el alta de unidades físicas
(`POST /inventory/units`, primera mitad de RF-1.2 — "doy de alta una unidad
física...") no tiene UI en este sprint; el foco de Frontend en RF-1.2 es
específicamente "el QR es escaneable desde la PWA" (así lo señala
PROMPT_IMPLEMENTACION.md). El escenario BDD de RF-1.2 arma un fixture para
esa parte y verifica de punta a punta solo la parte de escaneo.

## Librería de escaneo QR — decisión y por qué

`@zxing/browser` (`BrowserQRCodeReader` sobre `getUserMedia`) en vez de la
API nativa `BarcodeDetector`: `BarcodeDetector` no tiene soporte estable en
todos los navegadores objetivo (Firefox/Safari) a la fecha de este sprint,
mientras que ZXing corre en JS puro sobre cualquier navegador con
`getUserMedia` — el requisito real de una PWA que debe funcionar en el
dispositivo del almacenista/repartidor sin depender del navegador
específico.

El QR físico codifica el UUID de la unidad directamente (`docs/DESIGN.md`
§4.1: *"TOOL_UNITS { uuid id PK 'also encoded in the physical QR' }"*), así
que decodificarlo navega directo a `/unidades/:id`.

### Mock de cámara en tests

`QrScannerComponent` expone un seam de testing: si
`window.__E2E_QR_MOCK__` está definido, se usa ese valor como resultado
decodificado en vez de acceder a la cámara real. Es un global de solo
lectura que ningún build de producción setea — lo usan los tests BDD
(`e2e-bdd/steps/inventory.steps.ts`, vía `page.addInitScript`) para no
depender de una cámara real en CI, tal como pidió el Tech Lead.

## Fotos de evidencia (RF-1.3) — placeholder documentado

`openapi.yaml` (`PATCH /inventory/units/{id}/status`) espera `fotos_urls:
string[]` (URIs ya subidas), no archivos binarios, y no hay un endpoint de
subida de fotos en el alcance de este sprint (líneas 59-244). Como
placeholder, `UnitDetailComponent` usa `URL.createObjectURL(file)` como
"url" por archivo seleccionado — cuando Backend defina un endpoint real de
subida (p. ej. Supabase Storage), se reemplaza sin tocar el resto del
flujo.

## Offline-first — arranque de este sprint

Definition of Done de Fase 1 (`docs/DESIGN.md` §8): la PWA debe operar
offline y sincronizar al reconectar. Este sprint arranca esa base
(`PROMPT_IMPLEMENTACION.md`: "no lo dejes para el final: validalo
incrementalmente desde Sprint 1"), sin cerrarla del todo:

- `@angular/service-worker` + `ngsw-config.json` cachean el shell de la app
  (solo habilitado en producción, `environment.production`).
- `core/offline/offline-queue.service.ts` — cola de mutaciones pendientes
  (`PATCH .../status`) en IndexedDB nativo.
- `core/offline/offline-sync.service.ts` — reintenta la cola al recibir el
  evento `online` del navegador.
- `UnitDetailComponent.submit()` encola automáticamente si
  `navigator.onLine === false` o si la llamada HTTP falla, y muestra un
  mensaje de "sin conexión" al usuario (`data-testid="offline-queued-message"`).

Pendiente para sprints siguientes: UI de "pendientes por sincronizar",
reintentos con backoff, y persistencia de la ficha de unidad ya escaneada
para poder ver estado en modo avión.

## Tipos locales

`core/models/inventory.models.ts` define `ToolUnit` /
`ToolUnitStatusLogEntry` reflejando los schemas de `openapi.yaml` (líneas
740-767). No se tocó `packages/shared-types` (misma decisión que
portal-cliente).

## BDD (Playwright-BDD)

`e2e-bdd/` conecta los escenarios `@RF-1.2` y `@RF-1.3` de
`features/01_catalogo_inventario.feature`. Se ejecuta como parte de
`pnpm test` (`test:bdd`), levantando `ng serve` en el puerto 4202.

## Comandos

- `pnpm start` — `ng serve` (puerto 4202).
- `pnpm build` — build de producción (Native Federation + Service Worker).
- `pnpm test` — unit tests (Karma/Jasmine) y luego los escenarios BDD.
- `pnpm lint` — ESLint.
