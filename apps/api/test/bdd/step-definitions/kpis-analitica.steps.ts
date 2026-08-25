import { Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { ToolboxWorld } from "../support/world";

// ============================================================================
// Escenario: Gerente consulta ingresos totales desglosados (@Fase1, HU-7.1,
// Issue #19). Los escenarios @Fase2 (ROI, utilización/productividad) de
// features/07_kpis_analitica.feature NO tienen step definitions a propósito
// — quedan `undefined` (Sprint 10, Issues #20/#21), y `cucumber.cjs` los
// excluye de la corrida vía `tags: "not @Fase2"` (ver comentario ahí).
//
// El Given "que soy un Gerente autenticado" NO se redefine acá: el texto es
// idéntico al de `logistica-flota.steps.ts:89` (mismo Gherkin literal en dos
// features distintos) y Cucumber no permite dos step definitions que
// matcheen el mismo texto ("Multiple step definitions match"). Ese Given
// solo fija usuario/rol — no sirve para sembrar datos de este escenario (no
// hay overlap de dominio), así que la siembra de pagos + el periodo elegido
// se resuelven acá en el When, que sí es un texto exclusivo de este feature.
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
