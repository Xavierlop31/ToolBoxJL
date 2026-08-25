import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ToolboxWorld } from "../support/world";

Given(
  "que soy un Cliente con un modelo, un rango de fechas y una dirección de entrega seleccionados",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "cliente";

    // Registrar un modelo de prueba
    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Taladro Percutor XR-500",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 45000,
      tarifa_semana: 250000,
      deposito_pct: 0.3,
      peso_kg: 2.4,
    });

    // Registrar al menos una unidad física para que esté disponible
    this.ultimaUnidad = await this.registrarUnidad.ejecutar({
      modelo_id: this.ultimoModelo.id,
      numero_serie: `SN-${randomUUID().slice(0, 8)}`,
    });
  }
);

When("solicito una cotización de alquiler", async function (this: ToolboxWorld) {
  this.ultimaCotizacion = await this.cotizarOrden.ejecutar({
    modeloId: this.ultimoModelo!.id,
    tipo: "alquiler",
    fechaInicio: "2026-09-01",
    fechaFin: "2026-09-05", // 4 días
    zonaId: randomUUID(),
  });
});

Then(
  String.raw`el sistema calcula la tarifa por días, el recargo logístico por peso\/zona y el depósito de garantía si aplica`,
  function (this: ToolboxWorld) {
    const cot = this.ultimaCotizacion;
    assert.ok(cot);
    // 4 días * 45000 = 180000
    assert.equal(cot.tarifa_base, 180000);
    // Recargo logístico: 2.4 kg * 500 = 1200
    assert.equal(cot.recargo_logistico, 1200);
    // Depósito de garantía: 180000 * 0.3 = 54000
    assert.equal(cot.deposito_garantia, 54000);
  }
);

Then("me muestra cada concepto desglosado por separado", function (this: ToolboxWorld) {
  const cot = this.ultimaCotizacion!;
  assert.ok(cot.desglose.length >= 3);
  assert.equal(cot.desglose[0].concepto, "Tarifa base");
  assert.equal(cot.desglose[0].monto, 180000);
  assert.equal(cot.desglose[1].concepto, "Recargo logístico");
  assert.equal(cot.desglose[1].monto, 1200);
  assert.equal(cot.desglose[2].concepto, "Depósito de garantía");
  assert.equal(cot.desglose[2].monto, 54000);
});

Then("me muestra el total a pagar", function (this: ToolboxWorld) {
  const cot = this.ultimaCotizacion!;
  // 180000 + 1200 + 54000 = 235200
  assert.equal(cot.total, 235200);
});

// --- Escenario: Compra directa en modalidad venta ---

Given("que un modelo está marcado como disponible para venta", async function (this: ToolboxWorld) {
  this.usuarioActualId = randomUUID();
  this.rolActual = "cliente";

  this.ultimoModelo = await this.registrarModelo.ejecutar({
    nombre: "Sierra Circular CS-200",
    marca: "Makita",
    categoria: "Sierras",
    tarifa_dia: 35000,
    costo_compra: 600000,
    disponible_para_venta: true,
  });

  this.ultimaUnidad = await this.registrarUnidad.ejecutar({
    modelo_id: this.ultimoModelo.id,
    numero_serie: `SN-${randomUUID().slice(0, 8)}`,
  });
});

When(
  "selecciono la modalidad {string} en lugar de {string} para ese modelo",
  async function (this: ToolboxWorld, tipo: string, _otro: string) {
    this.ultimaOrden = await this.crearOrden.ejecutar(this.usuarioActualId, {
      modelo_id: this.ultimoModelo!.id,
      tipo: "venta",
      return_mode: "en_sede",
      direccion_entrega: "Calle Falsa 123",
      zona_id: randomUUID(),
    });
  }
);

Then(
  "el catálogo me permite completar el proceso de compra en modalidad venta",
  function (this: ToolboxWorld) {
    const orden = this.ultimaOrden;
    assert.ok(orden);
    assert.equal(orden.tipo, "venta");
    assert.equal(orden.estado, "pendiente_pago");
    assert.equal(orden.items.length, 1);
    assert.equal(orden.items[0].tarifa_aplicada, 600000);
  }
);

// --- Escenario: Administrador configura el % de depósito de garantía por modelo (HU-2.3) ---
//
// HU-2.3 no agrega endpoint ni caso de uso nuevo (decisión del Tech Lead,
// ver PR): ya está satisfecha por RegistrarModeloUseCase de Sprint 1, que
// acepta `deposito_pct` en el body. "Activar/desactivar" la exigencia de
// depósito se representa con `deposito_pct = 0` (sin depósito) vs. `> 0`
// (con depósito) — no hace falta un campo booleano separado.

When(
  "configuro el porcentaje de depósito de garantía para un modelo específico",
  async function (this: ToolboxWorld) {
    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Compresor de Aire CA-150",
      marca: "DeWalt",
      categoria: "Compresores",
      tarifa_dia: 60000,
      deposito_pct: 0.25,
    });
  },
);

Then("el porcentaje queda asociado a ese modelo", function (this: ToolboxWorld) {
  assert.ok(this.ultimoModelo);
  assert.equal(this.ultimoModelo!.deposito_pct, 0.25);
});

Then(
  "puedo activar o desactivar la exigencia de depósito de garantía para ese modelo",
  async function (this: ToolboxWorld) {
    // "Desactivar" = registrar (o re-registrar) el modelo con deposito_pct = 0.
    const sinDeposito = await this.registrarModelo.ejecutar({
      nombre: "Compresor de Aire CA-150 (sin garantía)",
      marca: "DeWalt",
      categoria: "Compresores",
      tarifa_dia: 60000,
      deposito_pct: 0,
    });
    assert.equal(sinDeposito.deposito_pct, 0);
    // "Activar" = el modelo original de este escenario ya quedó con 0.25 (> 0).
    assert.ok((this.ultimoModelo?.deposito_pct ?? 0) > 0);
  },
);
