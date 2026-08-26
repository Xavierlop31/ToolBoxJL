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
      "../../features/06_autenticacion_seguridad.feature",
      "../../features/07_kpis_analitica.feature",
      "../../features/08_agente_ruteo.feature"
    ],
    require: ["test/bdd/support/**/*.ts", "test/bdd/step-definitions/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: ["progress"],
    // `07_kpis_analitica.feature` tiene 2 escenarios `@Fase2` (ROI,
    // utilización/productividad — Sprint 10, Issues #20/#21) sin step
    // definitions a propósito (Issue #19 solo cubre el escenario `@Fase1`,
    // ver kpis-analitica.steps.ts). Sin un filtro, esos escenarios
    // quedarían "undefined" y romperían la corrida.
    //
    // `08_agente_ruteo.feature` (Sprint 7) agrega el mismo problema pero
    // matizado: sus 2 escenarios son `@Fase2`, pero solo uno de los dos se
    // conecta acá — HU-8.2 ("Repartidor ve su ruta", agente-ruteo.steps.ts,
    // Issue #23). HU-8.1 ("Batch nocturno genera y publica rutas") lo
    // conecta el subagente de IA contra `apps/workers`, no contra este
    // TestingModule de `apps/api` — así que acá debe seguir excluido.
    //
    // Por eso el filtro ya no es un `not @Fase2` a secas: se agrega la
    // excepción `or @HU-8.2` para dejar pasar específicamente ese escenario
    // aunque esté tageado `@Fase2` (ver `@HU-8.2` en el feature). Cualquier
    // otro escenario `@Fase2` sin su propia excepción explícita acá queda
    // excluido por default — es el comportamiento seguro.
    tags: "not @Fase2 or @HU-8.2",
  },
};
