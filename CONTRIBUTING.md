# Cómo contribuir — ToolBox JL

## Antes de empezar un sprint

1. Revisa el Milestone del sprint activo y las issues de tipo `historia-usuario`
   asignadas a él.
2. Si el endpoint que vas a construir todavía no está en `openapi.yaml`, o el
   criterio de aceptación de tu historia no tiene escenario en
   `features/*.feature`, complétalo primero (spec-first) y pide revisión de ese
   cambio antes de escribir código. Ver Documento de Arquitectura §6.1 y Plan
   de Implementación §1.1.

## Reportar una tarea

Usa el template **"Tarea de sprint"** (`.github/ISSUE_TEMPLATE/tarea_dev.yml`)
para cualquier trabajo que no sea directamente una historia de usuario nueva
(refactor, spike, deuda técnica, configuración). Vincúlala a la historia de
usuario relacionada si aplica (`#N`).

Si vas a implementar una historia de usuario existente, comenta en su issue
que la estás tomando y muévela en el [Project](../../projects) a "In Progress".

## Flujo de rama y PR

- Rama por defecto: `main` (producción).
- Trabaja en `feature/<sprint>-<slug>` (p. ej. `feature/sprint1-catalogo-qr`).
- Abre un PR contra `main`. Vercel y Railway generan un despliegue de vista
  previa automáticamente para las apps afectadas.
- El PR debe: vincular la issue con `Closes #N`, pasar `ci.yml`, y si tocó
  `openapi.yaml` o `features/**`, pasar también `spec-lint.yml` / `bdd-lint.yml`.

## Definition of Done ampliada por SDD (Plan de Implementación §1.1)

Un endpoint o historia se considera terminado cuando:

1. Existe y es conforme a `openapi.yaml` (ruta, método, rol requerido, esquema
   de request/response) — verificable con `pnpm spec:lint`.
2. Los escenarios Gherkin de la historia en `features/*.feature` pasan como
   prueba automatizada (a medida que existan step definitions; hasta entonces,
   `pnpm bdd:lint` garantiza al menos que el Gherkin es sintácticamente válido).
3. Cumple la Definition of Done específica de la fase (Plan de Implementación
   §3 para Fase 1, §4 para Fase 2).

## Convención de commits

Commits descriptivos en español o inglés, en imperativo: `agrega endpoint de
cotización`, `fix: recargo logístico no consideraba zona`. No hay convención
estricta tipo Conventional Commits impuesta todavía — puede adoptarse en un
sprint posterior si el equipo lo decide.
