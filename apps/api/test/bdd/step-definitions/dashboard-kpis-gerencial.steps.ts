import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ToolboxWorld } from "../support/world";

/**
 * Step definitions de `features/15_dashboard_kpis_gerencial.feature` (Sprint
 * 15, Fase 3, Épica 15, Issue #153, HU-15.1). El archivo tiene 2 escenarios,
 * AMBOS conectados acá — a diferencia de otros features de "tabla/dashboard"
 * de sprints anteriores (ver la nota de cabecera de `inventario-qr.steps.ts`
 * sobre `@HU-13.1`/`@HU-13.4`, dejados fuera por ser 100% de UI), estos 2
 * SÍ describen explícitamente la FORMA de datos que devuelve el backend
 * (los 4 KPIs del escenario 1, la clasificación de severidad/acción del
 * escenario 2) — no solo "veo una tabla"/"hago clic en una pestaña"; ambos
 * son verificables ejecutando `ObtenerDashboardKpisUseCase` directo, sin
 * necesitar renderizar el panel real de `apps/panel-admin`.
 *
 * "Dado que accedo a ..."/"Cuando visualizo el panel de ..." son en rigor
 * verbos de navegación de UI — acá hacen las veces de "y el backend
 * responde con estos datos", mismo criterio de doble propósito
 * (Given+fetch en un solo step, sin un When intermedio) que
 * `kpis-analitica.steps.ts` usa en su primer escenario ("abro el dashboard
 * de ingresos y selecciono un periodo").
 *
 * Por la barra `/` del path y los paréntesis del texto de los escenarios
 * (caracteres especiales de Cucumber Expressions), varios steps de abajo se
 * registran con un RegExp literal — mismo recurso que
 * `inventario-qr.steps.ts`/`agente-conserje-voz.steps.ts`.
 */

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/** `YYYY-MM-DD` de "hoy - dias días" (reloj REAL) — `ActualizarEstadoUnidadUseCase`/`OrderRepository` no aceptan una fecha de "ahora" inyectada, así que estos steps ejecutan el caso de uso con `new Date()` real. */
function fechaIsoHaceDias(dias: number): string {
  return new Date(Date.now() - dias * MS_POR_DIA).toISOString().slice(0, 10);
}

// ============================================================================
// Escenario 1 (@HU-15.1): Visualización de KPIs ejecutivos de alto impacto.
// Verifica presencia y forma de los 4 KPIs consolidados (los valores exactos
// de cada fórmula ya tienen su propia cobertura de Jest —
// `obtener-dashboard-kpis.use-case.spec.ts` — acá solo se comprueba que
// `GET /analytics/dashboard-kpis` los expone juntos, en una sola respuesta,
// tal como pide el escenario).
// ============================================================================

Given(/^que accedo a "\/admin\/dashboard-kpis"$/, async function (this: ToolboxWorld) {
  this.usuarioActualId = randomUUID();
  this.rolActual = "gerente";

  // Datos mínimos para que los 4 KPIs no queden todos en 0 (más
  // representativo del panel real) — mismo criterio de siembra
  // determinística que `kpis-analitica.steps.ts`.
  this.revenueRepository.limpiar();
  this.revenueRepository.registrarPago({
    tipo: "pago_alquiler",
    estado: "capturado",
    monto: 300_000,
    createdAt: new Date(),
  });
  this.revenueRepository.registrarPago({
    tipo: "cobro_mora",
    estado: "capturado",
    monto: 20_000,
    createdAt: new Date(),
  });

  this.roiRepository.limpiar();
  this.roiRepository.sembrar({
    modeloId: randomUUID(),
    costoCompra: 1_000_000,
    ingresosAcumulados: 1_300_000,
  });

  this.utilizationRepository.limpiar();
  const modeloId = randomUUID();
  this.utilizationRepository.sembrarUnidad({
    modeloId,
    estado: "Operativo",
    fechaIngreso: new Date(Date.now() - 60 * MS_POR_DIA),
  });
  this.utilizationRepository.sembrarAlquiler({
    modeloId,
    fechaInicio: new Date(Date.now() - 5 * MS_POR_DIA),
    fechaFin: new Date(),
  });

  this.ultimoDashboardKpis = await this.obtenerDashboardKpis.ejecutar(new Date());
});

Then(
  /^visualizo las métricas consolidadas: Ingresos Totales del Mes \(COP\) con variación porcentual, Tasa de Ocupación Global de Flota \(%\), Total Recaudado por Moras \(COP\) e Índice de Retorno de Inversión Promedio \(ROI %\)\.$/,
  function (this: ToolboxWorld) {
    const kpis = this.ultimoDashboardKpis;
    assert.ok(kpis, "se esperaba una respuesta de ObtenerDashboardKpisUseCase");

    // Los 4 KPIs macrofinancieros — presencia y forma (DashboardKpis,
    // openapi.yaml): números, nunca undefined/null/NaN/Infinity.
    for (const campo of [
      "ingresos_totales_mes",
      "variacion_ingresos_pct",
      "ocupacion_global_pct",
      "moras_recaudadas_mes",
      "roi_promedio_pct",
    ] as const) {
      assert.equal(typeof kpis![campo], "number", `se esperaba que "${campo}" fuera un number`);
      assert.ok(Number.isFinite(kpis![campo]), `"${campo}" no debe ser NaN/Infinity (valor: ${kpis![campo]})`);
    }

    // "Ingresos Totales del Mes (COP) con variación porcentual" — la
    // siembra del Given garantiza ingresos > 0 este mes.
    assert.equal(kpis!.ingresos_totales_mes, 320_000);
    // "Total Recaudado por Moras (COP)" — mismo dato que cobros_mora del mes.
    assert.equal(kpis!.moras_recaudadas_mes, 20_000);
    // "Índice de Retorno de Inversión Promedio (ROI %)".
    assert.equal(kpis!.roi_promedio_pct, 30);
    // "Tasa de Ocupación Global de Flota (%)" — > 0 con la siembra de arriba.
    assert.ok(kpis!.ocupacion_global_pct > 0);

    assert.ok(Array.isArray(kpis!.alertas_criticas), "alertas_criticas debe ser un array (aunque esté vacío)");
  },
);

// ============================================================================
// Escenario 2 (@HU-15.1): Panel de Alertas Críticas del Negocio. Siembra
// AMBOS disparadores (mantenimiento_recurrente + mora_cliente, este último
// con un caso "media" y uno "alta") para verificar la clasificación real de
// severidad y accion_sugerida que pide el Then.
// ============================================================================

Given(
  "que existen herramientas con más de 3 ingresos a taller en el mes o clientes con más de 5 días de mora",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "gerente";

    // Disparador 1: mantenimiento_recurrente — una unidad con MÁS de 3
    // transiciones a "En Mantenimiento" este mes.
    const modelo = await this.registrarModelo.ejecutar({
      nombre: "Taladro Percutor XR-500",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 45_000,
    });
    const unidad = await this.registrarUnidad.ejecutar({
      modelo_id: modelo.id,
      numero_serie: `SN-ALERTA-${randomUUID().slice(0, 8)}`,
    });
    for (let i = 0; i < 4; i++) {
      await this.actualizarEstado.ejecutar(unidad.id, "En Mantenimiento", [], this.usuarioActualId);
    }

    // Disparador 2a: mora_cliente — orden con 9 días de atraso -> "media".
    const clienteMedia = randomUUID();
    this.userRepository.sembrar({
      id: clienteMedia,
      nombre: "Cliente en Mora Media",
      email: "mora-media@example.com",
      telefono: null,
      rol: "cliente",
    });
    const ordenMedia = await this.orderRepository.crear({
      clienteId: clienteMedia,
      tipo: "alquiler",
      fechaInicio: fechaIsoHaceDias(15),
      fechaFin: fechaIsoHaceDias(9),
      returnMode: "en_sede",
      direccionEntrega: "Calle 10 # 20-30",
      zonaId: randomUUID(),
      items: [{ unidadId: randomUUID(), tarifaAplicada: 40_000 }],
    });
    await this.orderRepository.actualizarEstado(ordenMedia.id, "confirmada");

    // Disparador 2b: mora_cliente — orden con 19 días de atraso -> "alta".
    const clienteAlta = randomUUID();
    this.userRepository.sembrar({
      id: clienteAlta,
      nombre: "Cliente en Mora Alta",
      email: "mora-alta@example.com",
      telefono: null,
      rol: "cliente",
    });
    const ordenAlta = await this.orderRepository.crear({
      clienteId: clienteAlta,
      tipo: "alquiler",
      fechaInicio: fechaIsoHaceDias(30),
      fechaFin: fechaIsoHaceDias(19),
      returnMode: "en_sede",
      direccionEntrega: "Calle 10 # 20-30",
      zonaId: randomUUID(),
      items: [{ unidadId: randomUUID(), tarifaAplicada: 40_000 }],
    });
    await this.orderRepository.actualizarEstado(ordenAlta.id, "en_curso");
  },
);

When('visualizo el panel de "Alertas Críticas"', async function (this: ToolboxWorld) {
  this.ultimoDashboardKpis = await this.obtenerDashboardKpis.ejecutar(new Date());
});

Then(
  /^se listan tarjetas de alerta clasificadas por severidad \(Alta, Media, Informativa\) con botones de acción directa \("Revisar Ficha \/ Dar de Baja", "Ver Contrato \/ Contactar"\)\.$/,
  function (this: ToolboxWorld) {
    const alertas = this.ultimoDashboardKpis?.alertas_criticas;
    assert.ok(alertas, "se esperaba una respuesta de ObtenerDashboardKpisUseCase");
    assert.equal(alertas!.length, 3, "se esperaban 3 alertas: 1 mantenimiento_recurrente + 2 mora_cliente");

    // Toda tarjeta de alerta cae en uno de los 3 valores del enum de
    // severidad y en una de las 2 acciones sugeridas del contrato
    // (`AlertaCritica`, openapi.yaml) — "Informativa" queda reservado para
    // disparadores futuros, ningún caso de este escenario lo produce.
    for (const alerta of alertas!) {
      assert.ok(["alta", "media", "informativa"].includes(alerta.severidad));
      assert.ok(["Revisar Ficha / Dar de Baja", "Ver Contrato / Contactar"].includes(alerta.accion_sugerida));
    }

    const mantenimiento = alertas!.filter((a) => a.tipo === "mantenimiento_recurrente");
    assert.equal(mantenimiento.length, 1);
    assert.equal(mantenimiento[0].severidad, "alta");
    assert.equal(mantenimiento[0].accion_sugerida, "Revisar Ficha / Dar de Baja");

    const mora = alertas!.filter((a) => a.tipo === "mora_cliente");
    assert.equal(mora.length, 2);
    for (const alertaMora of mora) {
      assert.equal(alertaMora.accion_sugerida, "Ver Contrato / Contactar");
    }
    assert.ok(mora.some((a) => a.severidad === "media"), "se esperaba una alerta de mora 'media' (9 días de atraso)");
    assert.ok(mora.some((a) => a.severidad === "alta"), "se esperaba una alerta de mora 'alta' (19 días de atraso)");
  },
);
