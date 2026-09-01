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
      "../../features/09_agente_whatsapp.feature",
      "../../features/10_agente_conserje_voz.feature",
      // `12_catalogo_avanzado_carrito.feature` (Sprint 13, Issue #146,
      // HU-12.3): a diferencia de los `.feature` de arriba, sus 4
      // escenarios `@HU-12.3` comparten EXACTAMENTE los mismos tags
      // (`@HU-12.3 @Sprint13 @CarritoCompras`) — no hay un tag propio por
      // escenario (como sí existe `@HU-8.1` vs `@HU-8.2`) para filtrar solo
      // los 2 que sí tienen step definitions acá. Por eso se seleccionan
      // por NÚMERO DE LÍNEA (sintaxis `archivo.feature:línea` de
      // cucumber-js) en vez de por tag: `:69` ("Modificación de cantidades
      // de un producto" → PATCH /cart/items/{id}) y `:76` ("Eliminación de
      // un producto del carrito" → DELETE /cart/items/{id}), ver
      // carrito-multi-item.steps.ts. Los otros 2 escenarios `@HU-12.3`
      // ("Visualización del listado de ítems en el carrito" y "Cálculo del
      // resumen de compra consolidado") son puro layout de frontend
      // (imagen miniatura, panel lateral) sin contenido verificable desde
      // este TestingModule — le compete al subagente `frontend-developer`/
      // `qa-testing`. Los escenarios `@HU-12.1`/`@HU-12.2` de este mismo
      // archivo (Sprint 12, ya en `dev`) tampoco se conectan acá por el
      // mismo motivo (paginación/UI del catálogo, sin lógica de backend
      // nueva verificable vía Cucumber) — quedan fuera de este archivo de
      // paths por completo al no listarse líneas de ellos.
      "../../features/12_catalogo_avanzado_carrito.feature:69",
      "../../features/12_catalogo_avanzado_carrito.feature:76"
    ],
    require: ["test/bdd/support/**/*.ts", "test/bdd/step-definitions/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: ["progress"],
    // `07_kpis_analitica.feature` tenía 2 escenarios `@Fase2` (ROI —
    // `@HU-7.2` — y utilización/productividad — `@HU-7.3`) sin step
    // definitions (Sprint 6, Issue #19, solo cubría el escenario `@Fase1`).
    // Sprint 10 (Issues #20/#21) los conecta contra
    // ConsultarRoiUseCase/ConsultarUtilizacionUseCase/
    // ConsultarProductividadRepartidoresUseCase — ver kpis-analitica.steps.ts
    // — por eso se agregan `@HU-7.2`/`@HU-7.3` a las excepciones de abajo,
    // mismo criterio que `@HU-8.2`/`@HU-9.2`/`@HU-10.2`.
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
    // `10_agente_conserje_voz.feature` (Sprint 9) mismo caso otra vez: 2
    // escenarios `@Fase2`, pero solo HU-10.2 ("Artículo recomendado se
    // agrega automáticamente al carrito", cart.steps.ts, Issues #26/#27) se
    // conecta acá — es la única parte de este feature que le compete al
    // backend de apps/api (la asignación al carrito tras
    // POST /cart/add-item). HU-10.1 ("Cliente busca una herramienta por voz
    // con baja latencia") NO tiene step definitions acá a propósito: "se
    // abre una sesión LiveKit en tiempo real" y "la latencia total de la
    // respuesta es menor a 2.5 segundos" no son verificables desde un
    // TestingModule de NestJS sin un servidor LiveKit real ni un pipeline de
    // voz de punta a punta — le corresponde al subagente `apps/voice-agent`
    // (proceso del Agente 3, otro worktree) o a `qa-testing` medirlo con un
    // harness de latencia real, no a este backend.
    //
    // Por eso el filtro ya no es un `not @Fase2` a secas: se agregan las
    // excepciones `or @HU-7.2 or @HU-7.3 or @HU-8.2 or @HU-9.2 or @HU-10.2`
    // para dejar pasar específicamente esos escenarios aunque estén
    // tageados `@Fase2`. Cualquier otro escenario `@Fase2` sin su propia
    // excepción explícita acá queda excluido por default — es el
    // comportamiento seguro.
    tags: "not @Fase2 or @HU-7.2 or @HU-7.3 or @HU-8.2 or @HU-9.2 or @HU-10.2",
  },
};
