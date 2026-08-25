import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ModoRetorno } from "@toolboxjl/shared-types";
import type { ToolboxWorld } from "../support/world";

// ============================================================================
// Escenario: Checklist de inspección detecta un hallazgo y ejecuta la
// garantía (@RF-4.2, Issue #14)
// ============================================================================

Given(
  "que soy Repartidor o Almacenista recibiendo una herramienta devuelta",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "almacenista";

    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Taladro Percutor XR-500",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 45000,
      peso_kg: 2.4,
      deposito_pct: 0.3,
    });

    this.ultimaUnidad = await this.registrarUnidad.ejecutar({
      modelo_id: this.ultimoModelo.id,
      numero_serie: `SN-${randomUUID().slice(0, 8)}`,
    });

    const clienteId = randomUUID();
    this.ultimaOrden = await this.crearOrden.ejecutar(clienteId, {
      modelo_id: this.ultimoModelo.id,
      tipo: "alquiler",
      fecha_inicio: "2026-09-01",
      fecha_fin: "2026-09-05",
      return_mode: "en_sede",
      direccion_entrega: "Calle Falsa 123",
      zona_id: randomUUID(),
    });

    // Pagar con tarjeta: el depósito de garantía queda como "hold"
    // (preautorización) — es el caso que ejercita `capturarHold` en
    // `RegistrarInspeccionUseCase.ejecutarGarantia`. Además, pagar la orden
    // crea automáticamente el Shipment (tipo "entrega", Sprint 4) que se usa
    // como `shipment_id` del checklist de recepción.
    this.ultimoResultadoPago = await this.pagarOrden.ejecutar(
      this.ultimaOrden.id,
      clienteId,
      "tarjeta",
    );

    const shipments = await this.shipmentRepository.listarTodos();
    this.ultimosEnvios = shipments.filter((s) => s.order_id === this.ultimaOrden!.id);
    assert.equal(this.ultimosEnvios.length, 1, "se esperaba un único Shipment (1:1 con la orden)");
  },
);

When(
  "completo el checklist de inspección obligatorio con evidencia fotográfica",
  async function (this: ToolboxWorld) {
    const shipment = this.ultimosEnvios![0];
    this.ultimoChecklist = await this.registrarInspeccion.ejecutar({
      unidad_id: this.ultimaUnidad!.id,
      shipment_id: shipment.id,
      tipo: "recepcion",
      hallazgos: [{ descripcion: "Carcasa rota, falta la broca", severidad: "grave" }],
      fotos_urls: ["https://storage.example.com/inspecciones/foto-1.jpg"],
    });
  },
);

Then("el sistema registra el resultado del checklist", function (this: ToolboxWorld) {
  const checklist = this.ultimoChecklist;
  assert.ok(checklist);
  assert.ok(checklist!.id);
  assert.equal(checklist!.unidad_id, this.ultimaUnidad!.id);
  assert.equal(checklist!.shipment_id, this.ultimosEnvios![0].id);
  assert.equal(checklist!.tipo, "recepcion");
  assert.equal(checklist!.hallazgos.length, 1);
  assert.equal(checklist!.fotos_urls.length, 1);
});

Then(
  "si el hallazgo es negativo, por daño o pieza faltante, se activa la ejecución parcial o total del depósito de garantía",
  async function (this: ToolboxWorld) {
    assert.equal(this.ultimoChecklist!.garantia_ejecutada, true);

    // El depósito de garantía (creado como "hold" al pagar con tarjeta, ver
    // Given) queda capturado — la garantía se ejecutó sobre él.
    const pagos = await this.paymentRepository.listarPorOrden(this.ultimaOrden!.id);
    const deposito = pagos.find((p) => p.tipo === "deposito_garantia");
    assert.ok(deposito, "se esperaba un pago de depósito de garantía");
    assert.equal(deposito!.estado, "capturado");

    // Cierre del ciclo de vida de la devolución (GAP cerrado por el Tech
    // Lead, Sprint 5) — el Shipment queda "retornado" y la Order "devuelta".
    const shipmentActualizado = await this.shipmentRepository.buscarPorId(this.ultimosEnvios![0].id);
    assert.equal(shipmentActualizado!.estado_envio, "retornado");
    const ordenActualizada = await this.obtenerOrden.ejecutar(this.ultimaOrden!.id, {
      id: "sistema",
      email: null,
      rol: "admin",
    });
    assert.equal(ordenActualizada.estado, "devuelta");
  },
);

// ============================================================================
// Esquema del escenario: Cliente elige la modalidad de devolución
// (@RF-4.1, Issue #15) — HU-5.2 no agrega código de dominio nuevo (ya
// implementado en Sprint 4, ver PricingCalculatorService); acá solo se
// arma el modelo/cotización. El `Then "el resultado es {string}"` compartido
// vive en `pagos-garantia.steps.ts` (ver comentario ahí sobre por qué).
// ============================================================================

const MODALIDAD_A_RETURN_MODE: Record<string, ModoRetorno> = {
  "devolución en sede": "en_sede",
  "recogida a domicilio": "recogida_domicilio",
};

Given("que soy un Cliente con una orden activa próxima a vencer", async function (this: ToolboxWorld) {
  this.usuarioActualId = randomUUID();
  this.rolActual = "cliente";

  this.ultimoModelo = await this.registrarModelo.ejecutar({
    nombre: "Taladro Percutor XR-500",
    marca: "Bosch",
    categoria: "Taladros",
    tarifa_dia: 45000,
    peso_kg: 2.4,
  });
});

When("elijo la modalidad de devolución {string}", async function (this: ToolboxWorld, modalidad: string) {
  const returnMode = MODALIDAD_A_RETURN_MODE[modalidad.trim().toLowerCase()];
  if (!returnMode) {
    throw new Error(`Modalidad de devolución no reconocida en el feature: "${modalidad}".`);
  }
  this.returnModeEscenario = returnMode;
  this.ultimaCotizacion = await this.cotizarOrden.ejecutar({
    modeloId: this.ultimoModelo!.id,
    tipo: "alquiler",
    fechaInicio: "2026-09-01",
    fechaFin: "2026-09-05",
    zonaId: randomUUID(),
    returnMode,
  });
});

// ============================================================================
// Escenario: Cálculo y facturación automática de mora (@RF-4.3, Issue #16)
// ============================================================================

Given(
  "que una orden tiene fecha de devolución pactada y esta ya venció sin devolución registrada",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "cliente";

    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Compactadora de Placa CP-300",
      marca: "Wacker",
      categoria: "Compactadoras",
      tarifa_dia: 60000,
      interes_mora_dia: 0.05,
    });

    this.ultimaUnidad = await this.registrarUnidad.ejecutar({
      modelo_id: this.ultimoModelo.id,
      numero_serie: `SN-${randomUUID().slice(0, 8)}`,
    });

    // Fechas fijas y arbitrarias (no relativas a "ahora"): lo único que
    // importa es que fecha_fin quede en el pasado respecto al `ahora`
    // explícito que se le pasa a `EjecutarMoraCalculatorUseCase.ejecutar`
    // en el When — así el test es 100% determinístico y no depende de la
    // hora real en la que corre (evita que el redondeo hacia arriba de
    // `calcularMora`, sobre una fecha_fin sin componente horaria, sume un
    // día de más según en qué momento del día real se ejecute el test).
    this.ultimaOrden = await this.crearOrden.ejecutar(this.usuarioActualId, {
      modelo_id: this.ultimoModelo.id,
      tipo: "alquiler",
      fecha_inicio: "2026-01-01",
      fecha_fin: "2026-01-10",
      return_mode: "en_sede",
      direccion_entrega: "Calle Falsa 123",
      zona_id: randomUUID(),
    });

    // "confirmada" (no "devuelta"/"cerrada"/"cancelada") — candidata a mora.
    this.ultimoResultadoPago = await this.pagarOrden.ejecutar(
      this.ultimaOrden.id,
      this.usuarioActualId,
      "contra_entrega",
    );
  },
);

When("el MoraCalculatorJob se ejecuta", async function (this: ToolboxWorld) {
  // "ahora" fijo: exactamente 5 días (en ms) después de fecha_fin
  // (2026-01-10T00:00:00.000Z, ver Given) → diasRetraso determinístico = 5,
  // sin importar la hora real en la que corre el test (ver comentario del
  // Given).
  const fechaFin = new Date(this.ultimaOrden!.fecha_fin!);
  const ahora = new Date(fechaFin.getTime() + 5 * 24 * 60 * 60 * 1000);
  this.ultimosComprobantesMora = await this.ejecutarMoraCalculator.ejecutar(ahora);
});

Then(
  "el sistema calcula los días\\/horas de retraso multiplicados por el interés de mora configurado del modelo",
  function (this: ToolboxWorld) {
    assert.ok(this.ultimosComprobantesMora);
    const comprobante = this.ultimosComprobantesMora!.find((p) => p.order_id === this.ultimaOrden!.id);
    assert.ok(comprobante, "se esperaba un comprobante de mora para la orden del escenario");

    // fecha_fin fue "hace 5 días" (ver Given) → 5 días de retraso.
    // monto = tarifa_dia (60000) * interes_mora_dia (0.05) * 5 días = 15000.
    assert.equal(comprobante!.monto, 15000);
  },
);

Then("emite inmediatamente un comprobante de cobro pendiente", async function (this: ToolboxWorld) {
  const comprobante = this.ultimosComprobantesMora!.find((p) => p.order_id === this.ultimaOrden!.id);
  assert.ok(comprobante);
  assert.equal(comprobante!.tipo, "cobro_mora");
  assert.equal(comprobante!.estado, "pendiente");
  assert.equal(comprobante!.wompi_transaction_id, null);

  // Idempotencia (RF-4.3): correr el job de nuevo no debe duplicar el cobro.
  const segundaCorrida = await this.ejecutarMoraCalculator.ejecutar();
  assert.equal(
    segundaCorrida.find((p) => p.order_id === this.ultimaOrden!.id),
    undefined,
    "el job no debería volver a emitir un cobro de mora para la misma orden",
  );

  // GET /billing/mora/{orderId} (RF-4.3) — recalcula on-the-fly a partir de
  // los mismos datos (orden + modelo) que usó el job.
  this.ultimoComprobanteMora = await this.consultarMora.ejecutar(this.ultimaOrden!.id, {
    id: this.usuarioActualId,
    email: null,
    rol: "cliente",
  });
  assert.equal(this.ultimoComprobanteMora.order_id, this.ultimaOrden!.id);
  assert.equal(this.ultimoComprobanteMora.interes_mora_dia, 0.05);
  assert.ok(this.ultimoComprobanteMora.dias_retraso >= 5);
  assert.ok(this.ultimoComprobanteMora.monto_mora > 0);
});
