import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ToolboxWorld } from "../support/world";

/**
 * Step definitions de `features/10_agente_conserje_voz.feature`, escenario
 * "Artículo recomendado se agrega automáticamente al carrito" (@HU-10.2,
 * Issues #26/#27) — la ÚNICA parte de este feature que le compete al
 * backend de apps/api (ver cucumber.cjs para el detalle completo de por qué
 * el otro escenario, @HU-10.1, queda sin step definitions acá).
 *
 * Simplificación deliberada del When: el Agente 3 en sí (proceso de voz,
 * `apps/voice-agent`, otro subagente/worktree) NO corre dentro de este
 * TestingModule de NestJS — no hay pipeline de voz real acá (Deepgram/TTS/
 * LiveKit), a diferencia de `agente-whatsapp.steps.ts` (que sí simula un
 * loop de tool calling completo contra un cliente Anthropic mockeado,
 * porque ese loop SÍ vive en apps/api, en ProcesarMensajeEntranteUseCase).
 * Acá "el agente invoca POST /cart/add-item" se representa invocando
 * DIRECTAMENTE `AgregarItemCarritoUseCase` con el `usuario.id` del cliente
 * — es exactamente el mismo caso de uso que ejecuta el controller HTTP real
 * (`CartController.agregarItem`), así que el escenario sí valida la lógica
 * de negocio real de principio a fin (modelo existe, se agrega/suma la
 * línea, total recalculado server-side), solo sin la capa HTTP/JWT/LiveKit
 * de por medio (eso es responsabilidad del subagente `ia-agentes` o
 * `qa-testing`, con un harness de integración de punta a punta).
 */

Given("que el Agente 3 me recomendó una herramienta por voz", async function (this: ToolboxWorld) {
  this.usuarioActualId = randomUUID();
  this.rolActual = "cliente";

  this.herramientaRecomendada = await this.registrarModelo.ejecutar({
    nombre: "Taladro Percutor Inalámbrico",
    marca: "Bosch",
    categoria: "Taladros",
    tarifa_dia: 15_000,
  });
});

When("confirmo verbalmente que la quiero", async function (this: ToolboxWorld) {
  const herramienta = this.herramientaRecomendada!;
  // "Confirmo verbalmente que la quiero" → el Agente 3 invoca
  // POST /cart/add-item reenviando el JWT del cliente (ver
  // EmitirTokenLivekitUseCase/CartController) — acá se representa esa
  // invocación llamando directo al caso de uso, ver comentario de cabecera.
  this.ultimoCarrito = await this.agregarItemCarrito.ejecutar(this.usuarioActualId, {
    modelo_id: herramienta.id,
    cantidad: 1,
  });
});

Then(/^el agente invoca POST \/cart\/add-item$/, function (this: ToolboxWorld) {
  assert.ok(this.ultimoCarrito, "Se esperaba que AgregarItemCarritoUseCase (equivalente a POST /cart/add-item) se haya ejecutado");
});

Then("confirma verbalmente que el artículo fue agregado a mi carrito", async function (this: ToolboxWorld) {
  const herramienta = this.herramientaRecomendada!;
  // No alcanza con el `ultimoCarrito` que devolvió la llamada — se relee el
  // carrito con GET /cart (ObtenerCarritoUseCase) para confirmar que la
  // asignación quedó PERSISTIDA, no solo devuelta en la respuesta del POST.
  const carritoPersistido = await this.obtenerCarrito.ejecutar(this.usuarioActualId);

  assert.equal(carritoPersistido.items.length, 1);
  assert.equal(carritoPersistido.items[0].modelo_id, herramienta.id);
  assert.equal(carritoPersistido.items[0].cantidad, 1);
  assert.equal(carritoPersistido.total, herramienta.tarifa_dia); // venta: 1 * tarifa_dia (sin costo_compra cargado, ver cart-pricing.service.ts)
});
