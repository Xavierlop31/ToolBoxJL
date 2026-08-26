// Config de Cucumber para apps/voice-agent — mismo criterio que
// apps/workers/cucumber.cjs. A diferencia de los Agentes 1/2 (que comparten
// el archivo .feature de su sprint con otro subagente), los DOS escenarios
// de `10_agente_conserje_voz.feature` son responsabilidad completa del
// Agente 3 — no hace falta filtrar por `name`.
module.exports = {
  default: {
    paths: ["../../features/10_agente_conserje_voz.feature"],
    require: ["test/bdd/support/**/*.ts", "test/bdd/step-definitions/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: ["progress"],
  },
};
