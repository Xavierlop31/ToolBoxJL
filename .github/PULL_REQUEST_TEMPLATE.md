## Qué hace este PR

<!-- Resumen breve. -->

Closes #

## Checklist — Definition of Done (Plan de Implementación §1.1)

- [ ] Historia de usuario o tarea vinculada con `Closes #N`.
- [ ] Si este PR agrega o cambia un endpoint: `openapi.yaml` está actualizado y `pnpm spec:lint` pasa en verde.
- [ ] Si este PR implementa una historia con criterio de aceptación en Gherkin: el escenario correspondiente en `features/*.feature` pasa (o, si aún no hay step definitions para ese módulo, al menos `pnpm bdd:lint` pasa).
- [ ] `pnpm lint` y `pnpm test` pasan localmente.
- [ ] No se tocaron `apps/api` y `apps/workers` sin considerar el impacto en el deploy de Railway (o `apps/*` de Angular sin considerar el deploy de Vercel correspondiente).

## Notas para quien revisa

<!-- Cualquier contexto que no sea obvio del diff. -->
