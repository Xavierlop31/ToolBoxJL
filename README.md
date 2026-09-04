# ToolBox JL

Plataforma web para gestión, alquiler y venta de herramientas eléctricas, con
inventario serializado por QR, logística de reparto asistida por IA y tres
agentes autónomos (ruteo, WhatsApp conversacional y conserje de voz web).

Este repositorio es un **monorepo pnpm + Turborepo** con despliegues
independientes: los frontends Angular a **Vercel**, el backend NestJS y sus
workers a **Railway**.

## Documentación

Todo el paquete de arquitectura vive en [`docs/`](./docs):

| Documento | Contenido |
|---|---|
| `01_Documento_de_Arquitectura_ToolBoxJL.docx` | Decisiones de arquitectura, stack, metodología SDD |
| `02_PRD_ToolBoxJL.docx` | Épicas, historias de usuario, criterios de aceptación |
| `03_TRD_ToolBoxJL.docx` | Especificación técnica de los 3 agentes de IA |
| `04_Especificacion_UIUX_ToolBoxJL.docx` | Wireframes y especificación UX |
| `05_AppFlow_ToolBoxJL.docx` | Flujos de la aplicación |
| `06_Esquema_Backend_ToolBoxJL.docx` | Modelo de datos y contratos de API por módulo |
| `07_Plan_de_Implementacion_ToolBoxJL.docx` | Sprints, roles, propuesta económica, metodología SDD |
| `DESIGN.md` | Especificación de sistema alineada a las decisiones anteriores |

Dos artefactos adicionales, **versionados junto con el código** (no en Word),
son la fuente de verdad ejecutable de este proyecto bajo Spec-Driven
Development (ver Documento de Arquitectura §6.1 y Plan de Implementación §1.1):

- [`openapi.yaml`](./openapi.yaml) — contrato de API spec-first (OpenAPI 3.0).
- [`features/`](./features) — criterios de aceptación en Gherkin, un archivo por épica del PRD.

## Metodología: Spec-Driven Development (SDD)

Antes de implementar un endpoint, debe existir en `openapi.yaml`. Antes de
implementar una historia de usuario, su criterio de aceptación debe existir
como escenario Gherkin en `features/*.feature`. Claude Code recibe ambos
artefactos como contexto de entrada por sprint. La Definition of Done de cada
sprint (ver Plan de Implementación §1.1) exige que la implementación sea
conforme a `openapi.yaml` (verificable con Spectral) y que los escenarios
Gherkin relevantes pasen en CI. Ver [`CONTRIBUTING.md`](./CONTRIBUTING.md)
para el flujo completo.

## Estructura del monorepo

```
apps/
  shell/            # Angular host (Native Federation) — Vercel
  portal-cliente/    # Angular remote — Vercel
  panel-admin/        # Angular remote — Vercel
  pwa-logistica/       # Angular remote PWA — Vercel
  api/                  # NestJS, Clean Architecture — Railway
  workers/               # Cron / batch (Agente 1, MoraCalculatorJob, webhooks) — Railway
packages/
  shared-ui/         # Design tokens y componentes Angular compartidos
  shared-types/        # Tipos TS generados/derivados de openapi.yaml
docs/                   # Paquete de documentación (ver tabla arriba)
openapi.yaml
features/
```

> `apps/*` y `packages/*` todavía no existen en este repositorio: se
> scaffoldean en Sprint 0 (`ng new` / `nest new` dentro de este workspace ya
> configurado). Ver Plan de Implementación §3, Sprint 0.

## Desarrollo local

```bash
pnpm install
pnpm build      # turbo run build (afecta solo lo que cambió)
pnpm lint
pnpm test
pnpm spec:lint  # Spectral sobre openapi.yaml
pnpm bdd:lint   # valida sintaxis de features/*.feature
```

## CI/CD

Ver [`.github/workflows/`](./.github/workflows): `ci.yml` (lint/test/build vía
Turborepo), `spec-lint.yml` (Spectral sobre `openapi.yaml`), `bdd-lint.yml`
(validación de `features/*.feature`), `deploy-vercel.yml`, `deploy-railway.yml`.

## Ambiente Productivo
ToolBoxJL-Prod
https://toolboxjl-prod.railway.app
https://tool-box-jl-shell.vercel.app

## Ambiente Staging
ToolBoxJL-Dev
https://toolboxjl-dev.railway.app
https://tool-box-jl-shell-staging.vercel.app

## Calidad de Código
https://sonarcloud.io/summary/overall?id=Xavierlop31_ToolBoxJL&branch=main
