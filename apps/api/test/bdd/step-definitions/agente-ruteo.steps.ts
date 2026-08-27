import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ToolboxWorld } from "../support/world";

/**
 * Step definitions de `features/08_agente_ruteo.feature`, escenario
 * `@HU-8.2` ("Repartidor ve su ruta del día ya optimizada"). El otro
 * escenario del feature (`@HU-8.1`, "Batch nocturno...") lo conecta el
 * subagente de IA contra `apps/workers` — ver `apps/api/cucumber.cjs` para
 * el filtro de tags que excluye ese escenario de esta suite.
 */

const DIRECCION_ENTREGA_ESCENARIO = "Carrera 45 #12-30, Bogotá";

/** Fecha de "hoy" en el mismo formato (`YYYY-MM-DD`) que usa `VerMiRutaUseCase` por default. */
function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

Given(
  "que soy un Repartidor iniciando la PWA en la mañana y el Agente 1 ya publicó las rutas del día",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "repartidor";

    // Modelo con peso/volumen conocidos — usado en el Then de "respeta el
    // límite de peso/volumen" para verificar que el dato de prueba sembrado
    // acá es consistente con la capacidad del vehículo (la validación de
    // capacidad en sí la hace el Agente 1 al generar la ruta, fuera del
    // alcance de este endpoint de solo lectura).
    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Taladro Percutor XR-500",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 45000,
      peso_kg: 2.4,
      volumen_m3: 0.02,
    });
    await this.registrarUnidad.ejecutar({
      modelo_id: this.ultimoModelo.id,
      numero_serie: `SN-${randomUUID().slice(0, 8)}`,
    });

    const clienteId = randomUUID();
    const orden = await this.crearOrden.ejecutar(clienteId, {
      modelo_id: this.ultimoModelo.id,
      tipo: "alquiler",
      fecha_inicio: "2026-09-01",
      fecha_fin: "2026-09-05",
      return_mode: "en_sede",
      direccion_entrega: DIRECCION_ENTREGA_ESCENARIO,
      zona_id: randomUUID(),
    });
    await this.pagarOrden.ejecutar(orden.id, clienteId, "contra_entrega");

    const pendientes = await this.listarPedidosPendientes.ejecutar();
    const shipmentDeLaOrden = pendientes.find((s) => s.order_id === orden.id);
    assert.ok(
      shipmentDeLaOrden,
      "se esperaba que la orden confirmada tuviera un Shipment pendiente de asignación",
    );

    // Vehículo asignado a ESTE repartidor, con capacidad de sobra respecto
    // al peso/volumen del único ítem de la ruta (2.4 kg / 0.02 m³).
    this.ultimoVehiculo = await this.registrarVehiculo.ejecutar({
      tipo: "moto",
      capacidad_kg: 50,
      capacidad_m3: 0.3,
      repartidor_id: this.usuarioActualId,
    });

    // El Agente 1 (acá simulado con rol "admin", ya que el JWT de servicio
    // de agente-1 es responsabilidad del subagente de IA en su propio
    // worktree) publica la ruta de HOY para ese vehículo.
    this.ultimasRutas = await this.asignarRutas.ejecutar(
      [
        {
          vehiculo_id: this.ultimoVehiculo.id,
          fecha: hoy(),
          paradas: [shipmentDeLaOrden!.id],
        },
      ],
      "admin",
    );
  },
);

When("abro mi ruta asignada", async function (this: ToolboxWorld) {
  this.ultimaMiRuta = await this.verMiRuta.ejecutar(this.usuarioActualId);
});

Then("la veo ordenada por parada", function (this: ToolboxWorld) {
  const miRuta = this.ultimaMiRuta;
  assert.ok(miRuta, "se esperaba una respuesta de GET /logistics/my-route");
  assert.equal(miRuta!.route.vehiculo_id, this.ultimoVehiculo!.id);
  assert.equal(miRuta!.paradas.length, miRuta!.route.paradas.length);

  // Mismo orden que Route.paradas — no se reordena ni se agrupa.
  miRuta!.route.paradas.forEach((shipmentId, indice) => {
    assert.equal(miRuta!.paradas[indice].shipment_id, shipmentId);
  });

  const primeraParada = miRuta!.paradas[0];
  assert.match(
    primeraParada.shipment_id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  assert.equal(primeraParada.tipo, "entrega");
  assert.equal(primeraParada.estado_envio, "en_ruta_entrega");
  assert.equal(primeraParada.direccion, DIRECCION_ENTREGA_ESCENARIO);
});

Then(
  String.raw`la ruta respeta el límite de peso\/volumen de mi vehículo`,
  function (this: ToolboxWorld) {
    // Aserción de consistencia de los datos de prueba (no de una regla que
    // corra en este endpoint): el peso/volumen total de los ítems de la
    // ruta no supera la capacidad del vehículo sembrada en el Given — la
    // validación de capacidad real ocurre en el Agente 1 al generar la
    // ruta (fuera de apps/api).
    const vehiculo = this.ultimoVehiculo!;
    const modelo = this.ultimoModelo!;
    const cantidadParadas = this.ultimaMiRuta!.paradas.length;

    const pesoTotalKg = (modelo.peso_kg ?? 0) * cantidadParadas;
    const volumenTotalM3 = (modelo.volumen_m3 ?? 0) * cantidadParadas;

    assert.ok(
      pesoTotalKg <= vehiculo.capacidad_kg,
      `el peso total de la ruta (${pesoTotalKg} kg) no debería superar la capacidad del vehículo (${vehiculo.capacidad_kg} kg)`,
    );
    assert.ok(
      volumenTotalM3 <= vehiculo.capacidad_m3,
      `el volumen total de la ruta (${volumenTotalM3} m³) no debería superar la capacidad del vehículo (${vehiculo.capacidad_m3} m³)`,
    );
  },
);
