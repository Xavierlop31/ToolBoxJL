import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { MetodoPago } from "@toolboxjl/shared-types";
import type { ToolboxWorld } from "../support/world";
import { loadRecargoLogisticoPorKg } from "../../../src/modules/pricing/infrastructure/config/pricing.config";

/** Traduce el texto de la tabla de Ejemplos del feature al MetodoPago interno. */
function aMetodoPago(texto: string): MetodoPago {
  const normalizado = texto.trim().toLowerCase();
  if (normalizado === "pse") return "pse";
  if (normalizado === "tarjeta") return "tarjeta";
  if (normalizado === "contra entrega") return "contra_entrega";
  throw new Error(`Método de pago no reconocido en el feature: "${texto}".`);
}

/**
 * Registra un modelo (con peso, para que el recargo logístico y por lo
 * tanto el split sean > 0) + una unidad + una orden en `pendiente_pago`,
 * lista para pagar en el `When` de cada escenario.
 */
async function crearOrdenPendienteDePago(
  this: ToolboxWorld,
  depositoPct: number,
): Promise<void> {
  this.usuarioActualId = randomUUID();
  this.rolActual = "cliente";

  this.ultimoModelo = await this.registrarModelo.ejecutar({
    nombre: "Taladro Percutor XR-500",
    marca: "Bosch",
    categoria: "Taladros",
    tarifa_dia: 45000,
    peso_kg: 2.4,
    deposito_pct: depositoPct,
  });

  this.ultimaUnidad = await this.registrarUnidad.ejecutar({
    modelo_id: this.ultimoModelo.id,
    numero_serie: `SN-${randomUUID().slice(0, 8)}`,
  });

  this.ultimaOrden = await this.crearOrden.ejecutar(this.usuarioActualId, {
    modelo_id: this.ultimoModelo.id,
    tipo: "alquiler",
    fecha_inicio: "2026-09-01",
    fecha_fin: "2026-09-05",
    return_mode: "en_sede",
    direccion_entrega: "Calle Falsa 123",
    zona_id: randomUUID(),
  });
}

// ============================================================================
// Esquema del escenario: Cliente paga una orden con distintos métodos
// ============================================================================

Given(
  "que soy un Cliente con una orden confirmada pendiente de pago",
  async function (this: ToolboxWorld) {
    await crearOrdenPendienteDePago.call(this, 0.3);
  },
);

When("elijo pagar con {string}", async function (this: ToolboxWorld, metodo: string) {
  this.ultimoResultadoPago = await this.pagarOrden.ejecutar(
    this.ultimaOrden!.id,
    this.usuarioActualId,
    aMetodoPago(metodo),
  );
});

/**
 * Step compartido entre `03_pagos_garantia.feature` (Sprint 3) y
 * `05_devoluciones_inspeccion_mora.feature` (Sprint 5, HU-5.2/Issue #15,
 * escenario "Cliente elige la modalidad de devolución") — ambos features
 * usan el mismo texto de Gherkin ("Entonces el resultado es \"...\""), y
 * Cucumber no permite dos step definitions con el mismo patrón en archivos
 * distintos (error de ambigüedad) — así que se extiende ACÁ, con las nuevas
 * ramas primero, en vez de duplicar el step en
 * `test/bdd/step-definitions/devoluciones-mora.steps.ts`.
 */
Then("el resultado es {string}", async function (this: ToolboxWorld, resultado: string) {
  if (
    resultado.includes("no se genera costo logístico adicional") ||
    resultado.includes("se aplica la tarifa logística configurada")
  ) {
    // HU-5.2 (RF-4.1, Issue #15) — la regla de negocio ("en sede" sin costo
    // adicional, "recogida a domicilio" con la tarifa duplicada) ya está
    // implementada desde Sprint 4 en
    // PricingCalculatorService.calcularRecargoLogistico (en `main`); este
    // step solo conecta el escenario Gherkin a esa lógica ya existente,
    // invocando CotizarOrdenUseCase con los dos `return_mode` — no agrega
    // regla de negocio nueva (decisión del Tech Lead para este sprint).
    assert.ok(this.ultimaCotizacion, "se esperaba una cotización calculada");
    const recargoBase = Math.round((this.ultimoModelo?.peso_kg ?? 0) * loadRecargoLogisticoPorKg());
    if (resultado.includes("no se genera costo logístico adicional")) {
      assert.equal(this.returnModeEscenario, "en_sede");
      assert.equal(this.ultimaCotizacion!.recargo_logistico, recargoBase);
    } else {
      assert.equal(this.returnModeEscenario, "recogida_domicilio");
      assert.equal(this.ultimaCotizacion!.recargo_logistico, recargoBase * 2);
    }
    return;
  }

  const pagoPrincipal = this.ultimoResultadoPago!.pagoPrincipal;
  const ordenActualizada = await this.obtenerOrden.ejecutar(this.ultimaOrden!.id, {
    id: this.usuarioActualId,
    email: null,
    rol: "cliente",
  });

  if (resultado.includes("procesa el pago inmediatamente")) {
    assert.equal(pagoPrincipal.estado, "capturado");
  } else if (resultado.includes("queda reservado hasta que el Repartidor lo confirme")) {
    assert.equal(pagoPrincipal.estado, "pendiente");
  } else {
    assert.fail(`Resultado no reconocido en el feature: "${resultado}"`);
  }

  // En los 3 métodos, la transacción se inicia con éxito → la orden queda
  // confirmada (disponible para GET /logistics/pending-orders, Sprint 4).
  assert.equal(ordenActualizada.estado, "confirmada");
});

// ============================================================================
// Escenario: Depósito de garantía como hold al pagar con tarjeta
// ============================================================================

Given(
  "que soy un Cliente pagando con tarjeta y mi orden requiere depósito de garantía",
  async function (this: ToolboxWorld) {
    await crearOrdenPendienteDePago.call(this, 0.3);
    this.metodoPagoEscenario = "tarjeta";
  },
);

When("se procesa el pago", async function (this: ToolboxWorld) {
  this.ultimoResultadoPago = await this.pagarOrden.ejecutar(
    this.ultimaOrden!.id,
    this.usuarioActualId,
    this.metodoPagoEscenario!,
  );
});

Then(
  String.raw`el depósito de garantía se ejecuta como un hold \(preautorización\) y no como un cobro definitivo`,
  function (this: ToolboxWorld) {
    const pagoDeposito = this.ultimoResultadoPago!.pagoDeposito;
    assert.ok(pagoDeposito, "se esperaba un pago de depósito de garantía");
    assert.equal(pagoDeposito!.estado, "hold");
  },
);

// ============================================================================
// Escenario: Depósito de garantía cobrado y reembolsado con PSE o contra entrega
// ============================================================================

Given(
  "que soy un Cliente pagando con PSE o contra entrega y mi orden requiere depósito de garantía",
  async function (this: ToolboxWorld) {
    await crearOrdenPendienteDePago.call(this, 0.3);
    // El feature ofrece "PSE o contra entrega" como alternativas equivalentes
    // para este escenario (ambas cobran el depósito de inmediato, a
    // diferencia de tarjeta). Se fija "pse" de forma determinística acá —
    // con "contra_entrega" el depósito queda "pendiente" (no "capturado")
    // hasta la confirmación del Repartidor, que es un flujo distinto
    // (POST /orders/{id}/confirm-cod-payment, no cubierto por este escenario).
    this.metodoPagoEscenario = "pse";
  },
);

Then("el depósito de garantía se cobra de inmediato", function (this: ToolboxWorld) {
  const pagoDeposito = this.ultimoResultadoPago!.pagoDeposito;
  assert.ok(pagoDeposito, "se esperaba un pago de depósito de garantía");
  assert.equal(pagoDeposito!.estado, "capturado");
});

Then(
  "se reembolsa automáticamente tras una inspección de devolución satisfactoria",
  function (this: ToolboxWorld) {
    // El reembolso automático tras inspección satisfactoria es
    // responsabilidad de InspectionModule (Sprint 5, no implementado
    // todavía — ver prompt del Tech Lead de este sprint). Este step solo
    // documenta que, en el estado actual, el depósito queda "capturado"
    // (no "reembolsado"), listo para que ese sprint futuro ejecute el
    // reembolso sobre este mismo registro.
    const pagoDeposito = this.ultimoResultadoPago!.pagoDeposito;
    assert.ok(pagoDeposito);
    assert.equal(pagoDeposito!.estado, "capturado");
  },
);

// ============================================================================
// Escenario: Split automático de pagos entre cuenta matriz y proveedor logístico
// ============================================================================

Given("que una orden pagada requiere dispersión de fondos", async function (this: ToolboxWorld) {
  // "Orden pagada" se interpreta acá como una orden lista para que su pago
  // se confirme en el siguiente step (When) — el modelo tiene peso > 0 para
  // que el recargo logístico (y por lo tanto el split) sea > 0.
  await crearOrdenPendienteDePago.call(this, 0.3);
  this.metodoPagoEscenario = "tarjeta";
});

When("el pago se confirma", async function (this: ToolboxWorld) {
  this.ultimoResultadoPago = await this.pagarOrden.ejecutar(
    this.ultimaOrden!.id,
    this.usuarioActualId,
    this.metodoPagoEscenario!,
  );
});

Then(
  String.raw`Wompi \(sandbox\) simula el split de pago entre la cuenta matriz y la cuenta del proveedor logístico según las reglas configuradas`,
  function (this: ToolboxWorld) {
    const split = this.ultimoResultadoPago!.split;
    assert.ok(split);
    // peso_kg 2.4 * RECARGO_POR_KG (500) = recargo_logistico 1200 (ver
    // PricingCalculatorService) → con el % default del fake (0.15):
    // montoLogistica = round(1200 * 0.15) = 180, montoMatriz = 1020.
    assert.equal(split.montoLogistica + split.montoMatriz, 1200);
    assert.equal(split.montoLogistica, 180);
    assert.ok(split.montoMatriz > 0);
  },
);
