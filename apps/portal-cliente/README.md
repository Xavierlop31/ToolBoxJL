# apps/portal-cliente

Remote Angular de ToolBox JL (B2C/B2B — perfil Cliente), montado por
`apps/shell` vía [Native Federation](https://github.com/angular-architects/module-federation-plugin)
en la ruta `/catalogo`. Ver `docs/DESIGN.md` §2 y §3.1.

Cubre RF-1.1 (visibilidad del catálogo) y RF-1.4 (disponibilidad real por
rango de fechas) — `features/01_catalogo_inventario.feature`, Issues #1-#4
(Sprint 1).

## Alcance de este sprint

- `GET /catalog/search` — búsqueda pública de modelos
  (`features/catalog-search/`).
- `GET /catalog/models/{id}` — ficha de modelo (`features/model-detail/`).
- `GET /inventory/check-availability` — disponibilidad real de unidades no
  reservadas en un rango de fechas, mostrada como
  `unidades_disponibles` (RF-1.4: "se me muestra únicamente el número de
  unidades realmente disponibles").

**Fuera de alcance (decisión del Tech Lead):** el formulario de alta de
modelo por Administrador (RF-1.1, primera mitad del escenario — "registro un
nuevo modelo...") vive en `panel-admin`, que todavía no existe en el roadmap
de Frontend de este sprint. `portal-cliente` cubre la mitad de RF-1.1 que sí
le corresponde: que el catálogo sea visible/consultable públicamente.

## Tipos locales

`core/models/catalog.models.ts` define `ToolModel` y `AvailabilityResult`
reflejando los schemas de `openapi.yaml` (líneas 717-739 y 234-244) —
**no** se tocó `packages/shared-types` este sprint (decisión del Tech Lead:
Backend agrega ahí sus propios tipos en paralelo).

## BDD (Playwright-BDD)

`e2e-bdd/` conecta el escenario `@RF-1.4` de
`features/01_catalogo_inventario.feature` a un runner real. Intercepta la
red con `page.route` (Backend corre en su propia rama, sin servidor real
disponible acá) contra las rutas del contrato. Se ejecuta como parte de
`pnpm test` (`test:bdd`), levantando `ng serve` en el puerto 4201 vía
`webServer` de Playwright.

## Comandos

- `pnpm start` — `ng serve` (puerto 4201).
- `pnpm build` — build de producción (Native Federation).
- `pnpm test` — unit tests (Karma/Jasmine + `HttpTestingController`) y luego
  los escenarios BDD (`test:bdd`, instala Chromium de Playwright si falta).
- `pnpm lint` — ESLint.
