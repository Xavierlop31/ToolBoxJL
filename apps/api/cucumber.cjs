// Config de Cucumber (BDD, punto 5 del prompt del Tech Lead — Sprint 1).
//
// Corre `features/01_catalogo_inventario.feature` y `features/02_cotizacion_alquiler_venta.feature`
// contra los step definitions de apps/api/test/bdd.
module.exports = {
  default: {
    paths: [
      "../../features/01_catalogo_inventario.feature",
      "../../features/02_cotizacion_alquiler_venta.feature",
      "../../features/03_pagos_garantia.feature",
      "../../features/04_logistica_flota.feature",
      "../../features/05_devoluciones_inspeccion_mora.feature",
      "../../features/07_kpis_analitica.feature"
    ],
    require: ["test/bdd/support/**/*.ts", "test/bdd/step-definitions/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: ["progress"],
    // `07_kpis_analitica.feature` tiene 2 escenarios `@Fase2` (ROI,
    // utilización/productividad — Sprint 10, Issues #20/#21) sin step
    // definitions a propósito (Issue #19 solo cubre el escenario `@Fase1`,
    // ver kpis-analitica.steps.ts). Sin este filtro, esos escenarios
    // quedarían "undefined" y romperían la corrida. Ningún otro feature
    // conectado acá usa la tag `@Fase2` hoy, así que el filtro no afecta a
    // los demás escenarios.
    tags: "not @Fase2",
  },
};
