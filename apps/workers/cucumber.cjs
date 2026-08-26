// Config de Cucumber para apps/workers (Sprint 7, Issue #22 — HU-8.1, Agente
// 1). Corre SOLO el escenario "Batch nocturno genera y publica rutas
// optimizadas" de `features/08_agente_ruteo.feature` — el otro escenario de
// ese archivo ("Repartidor ve su ruta del día...", HU-8.2/Issue #23) es
// responsabilidad del subagente de Frontend (PWA logística), filtrado acá
// por nombre para que esta suite no lo corra ni lo deje "undefined".
//
// Separado de `apps/api/cucumber.cjs` a propósito: el Agente 1 corre como
// job standalone de `apps/workers` (Railway, cron externo), no dentro del
// NestJS TestingModule de apps/api — no comparte World ni step definitions
// con esa suite (ver CLAUDE.md §3, cada app depende solo de packages/).
module.exports = {
  default: {
    paths: ["../../features/08_agente_ruteo.feature"],
    require: ["test/bdd/support/**/*.ts", "test/bdd/step-definitions/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: ["progress"],
    name: ["Batch nocturno genera y publica rutas optimizadas"],
  },
};
