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
      "../../features/08_agente_ruteo.feature",
      "../../features/09_agente_whatsapp.feature"
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
    // `09_agente_whatsapp.feature` (Sprint 8) es el mismo caso: 2 escenarios
    // `@Fase2`, pero solo HU-9.2 ("Cliente extiende su alquiler por voz",
    // agente-whatsapp.steps.ts, Issue #25) se conecta acá — el webhook
    // entrante y el loop de tool calling viven en `apps/api`. HU-9.1
    // ("Recordatorio de voz...", Issue #24) es el `WhatsAppReminderJob`
    // standalone de `apps/workers`, igual que HU-8.1.
    //
    // Por eso el filtro ya no es un `not @Fase2` a secas: se agregan las
    // excepciones `or @HU-8.2 or @HU-9.2` para dejar pasar específicamente
    // esos escenarios aunque estén tageados `@Fase2`. Cualquier otro
    // escenario `@Fase2` sin su propia excepción explícita acá queda
    // excluido por default — es el comportamiento seguro.
    tags: "not @Fase2 or @HU-8.2 or @HU-9.2",
  },
};
