import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { EstadoEnvio } from "@toolboxjl/shared-types";
import type { ToolboxWorld } from "../support/world";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// RF-3.1 — Administrador registra un vehículo de la flota
// ============================================================================
// Reusa el Given "que soy un Administrador autenticado" ya definido en
// catalogo-inventario.steps.ts (mismo texto exacto — Cucumber no permite
// redefinirlo en este archivo).

When(
  "registro un vehículo con su tipo, capacidad de carga en kg y m³, y zonas geográficas asociadas",
  async function (this: ToolboxWorld) {
    this.ultimoVehiculo = await this.registrarVehiculo.ejecutar({
      tipo: "camioneta",
      capacidad_kg: 800,
      capacidad_m3: 4.5,
      zonas: [randomUUID(), randomUUID()],
    });
  },
);

Then(
  "el vehículo queda disponible para asignación de rutas",
  async function (this: ToolboxWorld) {
    const vehiculo = this.ultimoVehiculo;
    assert.ok(vehiculo, "se esperaba que el vehículo se hubiera creado");
    assert.match(vehiculo!.id, UUID_REGEX);
    assert.equal(vehiculo!.tipo, "camioneta");
    assert.equal(vehiculo!.capacidad_kg, 800);
    assert.equal(vehiculo!.capacidad_m3, 4.5);
    assert.equal(vehiculo!.zonas.length, 2);
    assert.equal(vehiculo!.repartidor_id, null);

    // "Disponible para asignación de rutas" se verifica ejercitando el
    // caso de uso real de asignación (POST /logistics/assign-routes) con
    // este vehiculo_id y sin paradas — si el vehículo NO existiera,
    // AsignarRutasUseCase lanzaría VehiculoNoEncontradoError acá mismo.
    this.ultimasRutas = await this.asignarRutas.ejecutar([
      { vehiculo_id: vehiculo!.id, fecha: "2026-09-01", paradas: [] },
    ]);
    assert.equal(this.ultimasRutas.length, 1);
    assert.equal(this.ultimasRutas[0].vehiculo_id, vehiculo!.id);
    assert.equal(this.ultimasRutas[0].generada_por, "manual");
  },
);

// ============================================================================
// RF-3.3 — Gerente monitorea el estado de los envíos en tiempo real
// ============================================================================

/**
 * Crea una orden `confirmada` de principio a fin (modelo + unidad + orden +
 * pago) para que `PagarOrdenUseCase` genere su Shipment automáticamente
 * (`pendiente_asignacion` — ver decisión del Tech Lead en
 * payments/application/pagar-orden.use-case.ts).
 */
async function crearOrdenConfirmadaConEnvio(this: ToolboxWorld): Promise<void> {
  const clienteId = randomUUID();
  const modelo = await this.registrarModelo.ejecutar({
    nombre: "Taladro Percutor XR-500",
    marca: "Bosch",
    categoria: "Taladros",
    tarifa_dia: 45000,
    peso_kg: 2.4,
  });
  await this.registrarUnidad.ejecutar({
    modelo_id: modelo.id,
    numero_serie: `SN-${randomUUID().slice(0, 8)}`,
  });
  const orden = await this.crearOrden.ejecutar(clienteId, {
    modelo_id: modelo.id,
    tipo: "alquiler",
    fecha_inicio: "2026-09-01",
    fecha_fin: "2026-09-05",
    return_mode: "en_sede",
    direccion_entrega: "Calle Falsa 123",
    zona_id: randomUUID(),
  });
  await this.pagarOrden.ejecutar(orden.id, clienteId, "contra_entrega");
}

Given("que soy un Gerente autenticado", async function (this: ToolboxWorld) {
  this.usuarioActualId = randomUUID();
  this.rolActual = "gerente";

  // Dos órdenes confirmadas → dos Shipments en pendiente_asignacion. Uno de
  // los dos se asigna a una ruta para que el panel muestre más de un estado
  // real (pendiente_asignacion + en_ruta_entrega) — los 5 valores del enum
  // `estado_envio` en sí están garantizados por el tipo `EstadoEnvio`
  // (packages/shared-types/src/shipment.ts), no requieren datos "en vivo"
  // en los 5 estados simultáneamente para existir como contrato.
  await crearOrdenConfirmadaConEnvio.call(this);
  await crearOrdenConfirmadaConEnvio.call(this);

  const vehiculo = await this.registrarVehiculo.ejecutar({
    tipo: "moto",
    capacidad_kg: 50,
    capacidad_m3: 0.3,
  });
  this.ultimoVehiculo = vehiculo;

  const pendientes = await this.listarPedidosPendientes.ejecutar();
  assert.ok(pendientes.length >= 2, "se esperaban al menos 2 envíos pendientes de asignación");
  const primeroPendiente = pendientes[0];

  await this.asignarRutas.ejecutar([
    {
      vehiculo_id: vehiculo.id,
      fecha: "2026-09-02",
      paradas: [primeroPendiente.id],
    },
  ]);
});

When("abro el panel de seguimiento de envíos", async function (this: ToolboxWorld) {
  // GET /logistics/shipments: sirve el snapshot inicial del panel — las
  // actualizaciones en vivo posteriores las recibe el frontend por
  // Supabase Realtime (no hay una segunda llamada de "refresh" acá; ver
  // Then de abajo).
  this.ultimosEnvios = await this.listarEnvios.ejecutar();
});

const ESTADOS_EN_ESPANOL: Record<string, EstadoEnvio> = {
  "pendiente de asignación": "pendiente_asignacion",
  "en ruta de entrega": "en_ruta_entrega",
  entregado: "entregado",
  "en ruta de recogida": "en_ruta_recogida",
  retornado: "retornado",
};

Then(
  "veo el estado de cada pedido en curso entre {string}, {string}, {string}, {string} y {string}",
  function (
    this: ToolboxWorld,
    e1: string,
    e2: string,
    e3: string,
    e4: string,
    e5: string,
  ) {
    const estadosEsperados = [e1, e2, e3, e4, e5].map((texto) => {
      const estado = ESTADOS_EN_ESPANOL[texto.trim().toLowerCase()];
      assert.ok(estado, `Estado no reconocido en el feature: "${texto}".`);
      return estado;
    });
    // Los 5 estados del feature deben corresponder 1:1 a los 5 valores de
    // EstadoEnvio (packages/shared-types/src/shipment.ts) — si alguno no
    // matchea, `ESTADOS_EN_ESPANOL` quedó desalineado del contrato de API.
    assert.deepEqual(
      new Set(estadosEsperados),
      new Set<EstadoEnvio>([
        "pendiente_asignacion",
        "en_ruta_entrega",
        "entregado",
        "en_ruta_recogida",
        "retornado",
      ]),
    );

    const envios = this.ultimosEnvios!;
    assert.ok(envios.length >= 2, "se esperaban al menos 2 envíos en el panel");
    // El panel refleja el estado ACTUAL de cada envío — acá se verifica que
    // aparecen tanto el envío recién confirmado (pendiente_asignacion) como
    // el que se asignó a una ruta en el Given (en_ruta_entrega): ambos son
    // valores del mismo conjunto de 5 verificado arriba.
    assert.ok(envios.some((s) => s.estado_envio === "pendiente_asignacion"));
    assert.ok(envios.some((s) => s.estado_envio === "en_ruta_entrega"));
    for (const envio of envios) {
      assert.ok(estadosEsperados.includes(envio.estado_envio));
    }
  },
);

Then(
  "los estados se actualizan en tiempo real vía Supabase Realtime sin recargar la página",
  async function (this: ToolboxWorld) {
    // El backend no hace polling: `GET /logistics/shipments` siempre
    // devuelve el estado ACTUAL de la tabla `shipments` en el momento de la
    // consulta (se demuestra re-consultando sin ningún paso intermedio de
    // "recarga" — la migración de este sprint agrega
    // `ALTER PUBLICATION supabase_realtime ADD TABLE shipments;` para que
    // el frontend se suscriba directo a los cambios). Acá se verifica que
    // una nueva escritura (otra orden confirmada) aparece de inmediato en
    // una nueva lectura del mismo endpoint, sin ningún paso adicional de
    // "reload" — que es lo único que el backend puede garantizar; la
    // entrega en vivo al navegador es responsabilidad de Supabase Realtime
    // + el frontend (fuera de alcance de este módulo de Backend).
    await crearOrdenConfirmadaConEnvio.call(this);
    const enviosActualizados = await this.listarEnvios.ejecutar();
    assert.equal(enviosActualizados.length, this.ultimosEnvios!.length + 1);
  },
);

// ============================================================================
// RF-3.2 — Recargo logístico calculado por peso de la herramienta
// ============================================================================

Given(
  "que soy un Cliente cotizando un alquiler con entrega a domicilio",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "cliente";

    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Compactadora de Placa CP-300",
      marca: "Wacker",
      categoria: "Compactadoras",
      tarifa_dia: 60000,
      peso_kg: 8,
    });
  },
);

When("el sistema calcula el costo de envío", async function (this: ToolboxWorld) {
  // "Entrega a domicilio" (Given) se traduce en return_mode =
  // recogida_domicilio: dos viajes logísticos (entrega + recogida a
  // domicilio) — ver PricingCalculatorService.calcularRecargoLogistico.
  this.ultimaCotizacion = await this.cotizarOrden.ejecutar({
    modeloId: this.ultimoModelo!.id,
    tipo: "alquiler",
    fechaInicio: "2026-09-01",
    fechaFin: "2026-09-03", // 2 días
    zonaId: randomUUID(),
    returnMode: "recogida_domicilio",
  });
});

Then(
  "se aplica un recargo logístico parametrizable según el peso de la herramienta y la modalidad de entrega o recogida",
  async function (this: ToolboxWorld) {
    const cot = this.ultimaCotizacion!;
    // peso_kg 8 * RECARGO_LOGISTICO_POR_KG_COP (default 500, parametrizable
    // vía env var) * 2 (recogida_domicilio = dos viajes) = 8000.
    assert.equal(cot.recargo_logistico, 8000);

    // "Parametrizable según el peso": el doble de peso (mismo return_mode)
    // produce el doble de recargo.
    const modeloMasPesado = await this.registrarModelo.ejecutar({
      nombre: "Compactadora de Placa CP-600 (pesada)",
      marca: "Wacker",
      categoria: "Compactadoras",
      tarifa_dia: 60000,
      peso_kg: 16, // el doble de 8 kg
    });
    const cotizacionMasPesada = await this.cotizarOrden.ejecutar({
      modeloId: modeloMasPesado.id,
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-03",
      zonaId: randomUUID(),
      returnMode: "recogida_domicilio",
    });
    assert.equal(cotizacionMasPesada.recargo_logistico, 16000);

    // "Parametrizable según ... la modalidad de entrega o recogida": mismo
    // peso, en_sede (un viaje) vs. recogida_domicilio (dos viajes) → la
    // mitad del recargo.
    const cotizacionEnSede = await this.cotizarOrden.ejecutar({
      modeloId: this.ultimoModelo!.id,
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-03",
      zonaId: randomUUID(),
      returnMode: "en_sede",
    });
    assert.equal(cotizacionEnSede.recargo_logistico, 4000);
    assert.equal(cotizacionEnSede.recargo_logistico * 2, cot.recargo_logistico);
  },
);
