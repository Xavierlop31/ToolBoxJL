// Config de Cucumber (BDD, punto 5 del prompt del Tech Lead — Sprint 1).
//
// Corre `features/01_catalogo_inventario.feature` (raíz del repo, fuente de
// verdad de aceptación de RF-1.1 a 1.4) contra los step definitions de
// apps/api/test/bdd, que arrancan un `@nestjs/testing` TestingModule con las
// implementaciones IN-MEMORY de los repositorios (no Prisma) — no requiere
// DATABASE_URL ni una base real. Ver apps/api/test/bdd/support/world.ts.
module.exports = {
  default: {
    paths: ["../../features/01_catalogo_inventario.feature"],
    require: ["test/bdd/support/**/*.ts", "test/bdd/step-definitions/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: ["progress"],
  },
};
