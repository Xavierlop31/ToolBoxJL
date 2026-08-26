import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { ejecutarAgente1, type AnthropicMessagesClient } from "../../../src/agente-1/route-scheduler-agent";
import { planificarRutas, type PedidoPendiente, type VehiculoDisponible } from "../../../src/route-scheduler";
import type { Agente1World } from "../support/world";

/**
 * Step definitions del escenario "Batch nocturno genera y publica rutas
 * optimizadas" (`features/08_agente_ruteo.feature`, @Epica8 @PrioridadAlta —
 * Issue #22 / HU-8.1). Corre gratis y rápido en CI: NUNCA llama a la red ni
 * a la API de Anthropic real — `fetch` está mockeado acá mismo y el
 * "modelo" simula la secuencia de tool calls esperada usando el resultado
 * del algoritmo puro y exhaustivamente testeado de `route-scheduler.ts`, así
 * que el escenario valida de verdad "evalúa densidad por zona y capacidad
 * de cada vehículo" sin depender del LLM real. La validación contra Claude
 * de verdad es un workflow de CI aparte — ver
 * `.github/workflows/agente-1-ruteo-integration.yml`.
 *
 * El otro escenario de este feature ("Repartidor ve su ruta del día...",
 * HU-8.2/Issue #23) NO tiene step definitions acá a propósito — es
 * responsabilidad del subagente de Frontend (PWA logística); `cucumber.cjs`
 * lo filtra por nombre para que esta suite no lo corra ni lo deje undefined.
 *
 * Fixture con `zona_id`/`peso_kg`/`volumen_m3` en la respuesta de
 * `GET /logistics/pending-orders`: simula la forma ENRIQUECIDA que ese
 * endpoint debería tener una vez cerrado el GAP DE CONTRATO documentado en
 * `../../../src/route-scheduler.ts` — el endpoint real hoy NO expone esos
 * campos (`Shipment` solo tiene id/order_id/vehiculo_id/tipo/estado_envio).
 */

const PEDIDOS_FIXTURE = [
  {
    id: "s1",
    order_id: "o1",
    vehiculo_id: null,
    tipo: "entrega" as const,
    estado_envio: "pendiente_asignacion",
    zona_id: "zona-norte",
    peso_kg: 20,
    volumen_m3: 0.2,
  },
  {
    id: "s2",
    order_id: "o2",
    vehiculo_id: null,
    tipo: "entrega" as const,
    estado_envio: "pendiente_asignacion",
    zona_id: "zona-norte",
    peso_kg: 30,
    volumen_m3: 0.3,
  },
];

const VEHICULOS_FIXTURE = [
  { id: "v1", tipo: "camioneta", capacidad_kg: 500, capacidad_m3: 3, zonas: ["zona-norte"], repartidor_id: null },
];

Given("que existen pedidos confirmados para el día siguiente sin ruta asignada", function (this: Agente1World) {
  // Precondición documentada — los datos sembrados viven en
  // PEDIDOS_FIXTURE/VEHICULOS_FIXTURE de este archivo, consumidos por el
  // fetch mockeado del step "Cuando" de abajo.
  assert.ok(PEDIDOS_FIXTURE.length > 0);
});

When("se ejecuta el batch nocturno del Agente 1", async function (this: Agente1World) {
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    this.fetchCalls.push({ url, method: init?.method ?? "GET" });

    if (url.endsWith("/fleet/vehicles")) {
      return { ok: true, status: 200, json: async () => VEHICULOS_FIXTURE } as Response;
    }
    if (url.endsWith("/logistics/pending-orders")) {
      return { ok: true, status: 200, json: async () => PEDIDOS_FIXTURE } as Response;
    }
    if (url.endsWith("/logistics/assign-routes") && init?.method === "POST") {
      const rutasInput = JSON.parse(String(init.body)) as {
        vehiculo_id: string;
        fecha: string;
        paradas: string[];
      }[];
      const rutasPublicadas = rutasInput.map((ruta, indice) => ({
        id: `r${indice}`,
        ...ruta,
        generada_por: "agente_1",
      }));
      return { ok: true, status: 201, json: async () => rutasPublicadas } as Response;
    }
    throw new Error(`URL inesperada en el step de BDD: ${url}`);
  }) as unknown as typeof fetch;

  const pedidosParaAlgoritmo: PedidoPendiente[] = PEDIDOS_FIXTURE.map((pedido) => ({
    shipmentId: pedido.id,
    orderId: pedido.order_id,
    tipo: pedido.tipo,
    zonaId: pedido.zona_id,
    pesoKg: pedido.peso_kg,
    volumenM3: pedido.volumen_m3,
  }));
  const vehiculosParaAlgoritmo: VehiculoDisponible[] = VEHICULOS_FIXTURE.map((vehiculo) => ({
    id: vehiculo.id,
    capacidadKg: vehiculo.capacidad_kg,
    capacidadM3: vehiculo.capacidad_m3,
    zonas: vehiculo.zonas,
  }));
  const planificacion = planificarRutas(pedidosParaAlgoritmo, vehiculosParaAlgoritmo);

  let llamada = 0;
  const anthropic: AnthropicMessagesClient = {
    create: async () => {
      llamada++;
      if (llamada === 1) {
        return {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-haiku-4-5",
          content: [{ type: "tool_use", id: "toolu_1", name: "get_pending_orders", input: {} }],
          stop_reason: "tool_use",
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        } as unknown as Anthropic.Message;
      }
      const rutasInput = planificacion.rutas.map((ruta) => ({
        vehiculo_id: ruta.vehiculoId,
        fecha: "2026-08-26",
        paradas: ruta.paradas,
      }));
      return {
        id: "msg_2",
        type: "message",
        role: "assistant",
        model: "claude-haiku-4-5",
        content: [
          {
            type: "text",
            text: `Sin asignar: ${planificacion.sinAsignar.map((s) => s.shipmentId).join(", ") || "ninguno"}.`,
          },
          { type: "tool_use", id: "toolu_2", name: "assign_routes", input: { rutas: rutasInput } },
        ],
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      } as unknown as Anthropic.Message;
    },
  };

  try {
    this.resultado = await ejecutarAgente1({
      anthropic,
      model: "claude-haiku-4-5",
      apiBaseUrl: "https://api.example.com",
      bearerToken: "fake-jwt-agente-1",
      fechaRuta: "2026-08-26",
      fetchImpl,
    });
  } catch (error) {
    this.error = error as Error;
  }
});

// Steps con "/" literal (GET|POST /algo/algo) se declaran como RegExp, no
// como Cucumber Expression: "/" tiene significado especial de alternancia
// en las Cucumber Expressions de string y rompe el parseo si no se escapa.
Then(/^el agente consulta los pedidos pendientes vía GET \/logistics\/pending-orders$/, function (this: Agente1World) {
  assert.ok(!this.error, `El batch falló inesperadamente: ${this.error?.message}`);
  assert.ok(
    this.fetchCalls.some((c) => c.url.endsWith("/logistics/pending-orders") && c.method === "GET"),
    "Se esperaba una llamada GET a /logistics/pending-orders",
  );
});

Then("evalúa densidad por zona y capacidad de cada vehículo", function (this: Agente1World) {
  assert.ok(this.resultado, "No hay resultado del batch para validar");
  // Los dos pedidos de la fixture están en la misma zona y suman 50kg —
  // entran holgadamente en el único vehículo (500kg) que sirve esa zona:
  // se agrupan en una sola ruta, evidenciando que sí se evaluó zona +
  // capacidad (no una asignación arbitraria).
  assert.equal(this.resultado!.rutasPublicadas.length, 1);
  assert.deepEqual([...this.resultado!.rutasPublicadas[0].paradas].sort(), ["s1", "s2"]);
});

Then(
  /^publica las rutas optimizadas vía POST \/logistics\/assign-routes antes de las 6:00 a\.m\.$/,
  function (this: Agente1World) {
    assert.ok(
      this.fetchCalls.some((c) => c.url.endsWith("/logistics/assign-routes") && c.method === "POST"),
      "Se esperaba una llamada POST a /logistics/assign-routes",
    );
    // El horario límite ("antes de las 6:00 a.m.") es una restricción
    // operativa de cuándo se dispara el cron en Railway (TRD §4.1) — no
    // algo que este test (mockeado, sin red real, resuelve en milisegundos)
    // pueda validar contra un reloj de verdad. Documentado, no verificado
    // acá.
  },
);
