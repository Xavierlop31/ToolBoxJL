import { Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ToolboxWorld } from "../support/world";

// ============================================================================
// Escenario @Fase1 (HU-7.1, Issue #19): Gerente consulta ingresos totales
// desglosados. Escenarios @Fase2 (HU-7.2 ROI / HU-7.3 utilización +
// productividad, Issues #20/#21, Sprint 10): conectados más abajo en este
// mismo archivo.
//
// El Given "que soy un Gerente autenticado" NO se redefine acá: el texto es
// idéntico al de `logistica-flota.steps.ts:89` (mismo Gherkin literal en dos
// features distintos) y Cucumber no permite dos step definitions que
// matcheen el mismo texto ("Multiple step definitions match"). Ese Given
// solo fija usuario/rol — no sirve para sembrar datos de estos escenarios
// (no hay overlap de dominio), así que la siembra de datos se resuelve en
// cada When, que sí es un texto exclusivo de este feature.
// ============================================================================

When("abro el dashboard de ingresos y selecciono un periodo", async function (this: ToolboxWorld) {
  this.periodoEscenario = "2026-08";

  // Datos determinísticos que ejercitan la fórmula completa (RF de
  // Analítica Fase 1: Ventas Directas + Tarifas de Alquiler + Cobros por
  // Mora) y sus tres exclusiones: pagos no capturados, pagos fuera del
  // periodo consultado, y `deposito_garantia` (nunca es ingreso).
  this.revenueRepository.limpiar();

  // Cuentan para el periodo "2026-08":
  this.revenueRepository.registrarPago({
    tipo: "pago_venta",
    estado: "capturado",
    monto: 100_000,
    createdAt: new Date("2026-08-05T12:00:00.000Z"),
  });
  this.revenueRepository.registrarPago({
    tipo: "pago_venta",
    estado: "capturado",
    monto: 50_000,
    createdAt: new Date("2026-08-20T12:00:00.000Z"),
  });
  this.revenueRepository.registrarPago({
    tipo: "pago_alquiler",
    estado: "capturado",
    monto: 45_000,
    createdAt: new Date("2026-08-10T12:00:00.000Z"),
  });
  this.revenueRepository.registrarPago({
    tipo: "cobro_mora",
    estado: "capturado",
    monto: 15_000,
    createdAt: new Date("2026-08-15T12:00:00.000Z"),
  });

  // NO cuentan (deben quedar excluidos del desglose):
  // 1. depósito de garantía capturado dentro del periodo — no es un ingreso.
  this.revenueRepository.registrarPago({
    tipo: "deposito_garantia",
    estado: "capturado",
    monto: 200_000,
    createdAt: new Date("2026-08-12T12:00:00.000Z"),
  });
  // 2. venta pendiente (no capturada) dentro del periodo.
  this.revenueRepository.registrarPago({
    tipo: "pago_venta",
    estado: "pendiente",
    monto: 99_999,
    createdAt: new Date("2026-08-06T12:00:00.000Z"),
  });
  // 3. venta capturada, pero fuera del periodo (mes anterior).
  this.revenueRepository.registrarPago({
    tipo: "pago_venta",
    estado: "capturado",
    monto: 77_777,
    createdAt: new Date("2026-07-31T23:59:59.000Z"),
  });
  // 4. alquiler capturado, pero fuera del periodo (justo en el límite
  // superior exclusivo — medianoche del 1° de septiembre).
  this.revenueRepository.registrarPago({
    tipo: "pago_alquiler",
    estado: "capturado",
    monto: 88_888,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
  });

  this.ultimosIngresos = await this.consultarIngresos.ejecutar(this.periodoEscenario);
});

Then(
  "veo los ingresos totales desglosados en Ventas Directas, Tarifas de Alquiler y Cobros por Mora para ese periodo",
  function (this: ToolboxWorld) {
    assert.ok(this.ultimosIngresos, "se esperaba una respuesta de ConsultarIngresosUseCase");
    const ingresos = this.ultimosIngresos!;

    assert.equal(ingresos.ventas_directas, 150_000);
    assert.equal(ingresos.tarifas_alquiler, 45_000);
    assert.equal(ingresos.cobros_mora, 15_000);
    // total = suma de los tres desgloses — NUNCA incluye deposito_garantia.
    assert.equal(ingresos.total, 210_000);
  },
);

// ============================================================================
// Escenario @HU-7.2 @Fase2 (Issue #20): Gerente consulta el ROI por
// herramienta. Fórmula: (Ingresos Acumulados − Costo de Compra) / Costo de
// Compra × 100 — ver ConsultarRoiUseCase.
// ============================================================================

When("consulto el ROI de un modelo específico", async function (this: ToolboxWorld) {
  const modeloId = randomUUID();
  this.roiRepository.limpiar();
  // Costo de compra: 800.000 COP. Ingresos acumulados (histórico completo,
  // ventas + alquiler + mora atribuidos a este modelo): 1.200.000 COP.
  // ROI esperado: (1.200.000 - 800.000) / 800.000 * 100 = 50%.
  this.roiRepository.sembrar({ modeloId, costoCompra: 800_000, ingresosAcumulados: 1_200_000 });
  // Otro modelo, sembrado solo para comprobar que el filtro por modelo_id
  // deja afuera su ROI de la respuesta.
  this.roiRepository.sembrar({ modeloId: randomUUID(), costoCompra: 500_000, ingresosAcumulados: 100_000 });

  this.ultimoRoi = await this.consultarRoi.ejecutar(modeloId);
});

Then(
  String.raw`el sistema calcula \(Ingresos Acumulados − Costo de Compra\) \/ Costo de Compra × 100 para ese modelo`,
  function (this: ToolboxWorld) {
    assert.ok(this.ultimoRoi, "se esperaba una respuesta de ConsultarRoiUseCase");
    assert.equal(this.ultimoRoi!.length, 1);
    assert.equal(this.ultimoRoi![0].roi_pct, 50);
  },
);

// ============================================================================
// Escenario @HU-7.3 @Fase2 (Issue #21): Gerente consulta utilización de
// inventario y productividad de repartidores. Fórmulas:
// - Utilización = Días Alquilada / Días Disponibles del mes (por modelo y
//   global) — ver ConsultarUtilizacionUseCase.
// - Productividad = Entregas Exitosas / Ruta Asignada, + tiempo promedio
//   por punto — ver ConsultarProductividadRepartidoresUseCase (el tiempo
//   promedio queda en 0, GAP documentado: no hay timestamps de
//   asignación/entrega en el schema actual).
// ============================================================================

/** "Ahora" fijo del escenario — agosto/2026, mes de 31 días, para que las cuentas del Then sean deterministas. */
const AHORA_KPIS_FASE2 = new Date("2026-08-17T12:00:00.000Z");

When(
  "consulto la tasa de utilización de inventario y la productividad de repartidores del mes",
  async function (this: ToolboxWorld) {
    const modeloId = randomUUID();
    this.utilizationRepository.limpiar();
    // 1 unidad disponible todo agosto (31 días), alquilada 10 días (1-11 ago, fecha_fin exclusiva) -> 10/31.
    this.utilizationRepository.sembrarUnidad({
      modeloId,
      estado: "Operativo",
      fechaIngreso: new Date("2026-01-01T00:00:00.000Z"),
    });
    this.utilizationRepository.sembrarAlquiler({
      modeloId,
      fechaInicio: new Date("2026-08-01T00:00:00.000Z"),
      fechaFin: new Date("2026-08-11T00:00:00.000Z"),
    });

    const repartidorId = randomUUID();
    this.deliveryProductivityRepository.limpiar();
    // 3 paradas asignadas en agosto: 2 exitosas (entrega->entregado, recogida->retornado), 1 todavía en curso.
    this.deliveryProductivityRepository.sembrarParada({
      repartidorId,
      tipo: "entrega",
      estadoEnvio: "entregado",
      fecha: new Date("2026-08-05T00:00:00.000Z"),
    });
    this.deliveryProductivityRepository.sembrarParada({
      repartidorId,
      tipo: "recogida",
      estadoEnvio: "retornado",
      fecha: new Date("2026-08-06T00:00:00.000Z"),
    });
    this.deliveryProductivityRepository.sembrarParada({
      repartidorId,
      tipo: "entrega",
      estadoEnvio: "en_ruta_entrega",
      fecha: new Date("2026-08-07T00:00:00.000Z"),
    });

    this.ultimaUtilizacion = await this.consultarUtilizacion.ejecutar(AHORA_KPIS_FASE2);
    this.ultimaProductividad = await this.consultarProductividad.ejecutar(AHORA_KPIS_FASE2);
  },
);

Then("veo la Utilización como Días Alquilada entre Días Disponibles del mes", function (this: ToolboxWorld) {
  assert.ok(this.ultimaUtilizacion, "se esperaba una respuesta de ConsultarUtilizacionUseCase");
  const esperado = Math.round((10 / 31) * 10000) / 100;
  assert.equal(this.ultimaUtilizacion!.por_modelo.length, 1);
  assert.equal(this.ultimaUtilizacion!.por_modelo[0].utilizacion_pct, esperado);
  assert.equal(this.ultimaUtilizacion!.utilizacion_global_pct, esperado);
});

Then(
  "veo la Productividad como Entregas Exitosas entre Ruta Asignada, junto con el tiempo promedio por punto",
  function (this: ToolboxWorld) {
    assert.ok(this.ultimaProductividad, "se esperaba una respuesta de ConsultarProductividadRepartidoresUseCase");
    assert.equal(this.ultimaProductividad!.length, 1);
    const [productividad] = this.ultimaProductividad!;
    assert.equal(productividad.entregas_exitosas, 2);
    assert.equal(productividad.ruta_asignada, 3);
    // GAP documentado (ver DeliveryProductivityRepository): sin timestamps
    // de asignación/entrega en el schema, se devuelve 0 explícitamente en
    // vez de inventar un tiempo promedio.
    assert.equal(productividad.tiempo_promedio_min, 0);
  },
);
