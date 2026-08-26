// Config de Cucumber para apps/workers. Corre SOLO los escenarios que
// implementan jobs standalone de apps/workers (Railway, cron externo), NO
// dentro del NestJS TestingModule de apps/api — no comparte World ni step
// definitions con esa suite (ver CLAUDE.md §3, cada app depende solo de
// packages/). Filtro por nombre (no por tag) porque cada feature mezcla
// escenarios de responsabilidad de distintos subagentes en el mismo archivo:
//
// - Sprint 7 (Issue #22, HU-8.1, Agente 1): "Batch nocturno genera y
//   publica rutas optimizadas" (`08_agente_ruteo.feature`) — el otro
//   escenario de ese archivo (HU-8.2/Issue #23, "Repartidor ve su ruta...")
//   es responsabilidad del subagente de Frontend (PWA logística).
// - Sprint 8 (Issue #24, HU-9.1, Agente 2): "Recordatorio de voz 24 horas
//   antes del vencimiento" (`09_agente_whatsapp.feature`) — el otro
//   escenario de ese archivo (HU-9.2/Issue #25, "Cliente extiende su
//   alquiler por voz...") lo conecta el subagente de IA contra
//   `apps/api` (el webhook entrante vive ahí), no acá.
module.exports = {
  default: {
    paths: ["../../features/08_agente_ruteo.feature", "../../features/09_agente_whatsapp.feature"],
    require: ["test/bdd/support/**/*.ts", "test/bdd/step-definitions/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: ["progress"],
    name: [
      "Batch nocturno genera y publica rutas optimizadas",
      "Recordatorio de voz 24 horas antes del vencimiento",
    ],
  },
};
