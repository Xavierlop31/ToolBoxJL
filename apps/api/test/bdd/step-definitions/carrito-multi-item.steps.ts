import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ToolboxWorld } from "../support/world";

/**
 * Step definitions de `features/12_catalogo_avanzado_carrito.feature`,
 * escenarios `@HU-12.3` "Modificación de cantidades de un producto" y
 * "Eliminación de un producto del carrito" (Sprint 13, Issue #146) — las
 * ÚNICAS 2 de los 4 escenarios `@HU-12.3` de ese feature que le competen al
 * backend de apps/api (mismo criterio documentado en
 * `agente-conserje-voz.steps.ts`/`cucumber.cjs` para HU-10.1 vs HU-10.2):
 * "Visualización del listado de ítems en el carrito" (imagen miniatura,
 * nombre, marca — puro layout de `GET /cart` en el frontend) y "Cálculo del
 * resumen de compra consolidado" (panel lateral de resumen — también puro
 * layout) no tienen contenido verificable desde un `TestingModule` de
 * NestJS sin renderizar HTML; le compete al subagente `frontend-developer`
 * o a `qa-testing` con un harness E2E real.
 *
 * "Hago clic en el botón +/eliminar" se representa invocando DIRECTAMENTE
 * `ActualizarCantidadCarritoUseCase`/`EliminarItemCarritoUseCase` — los
 * mismos casos de uso que ejecuta `CartController` (`PATCH`/`DELETE
 * /cart/items/{id}`), mismo criterio que el resto de los steps de este
 * repo (se valida la lógica de negocio real, no la capa HTTP/JWT).
 */

Given("que tengo un producto en el carrito con cantidad 1", async function (this: ToolboxWorld) {
  this.usuarioActualId = randomUUID();
  this.rolActual = "cliente";

  this.herramientaRecomendada = await this.registrarModelo.ejecutar({
    nombre: "Router de Banco",
    marca: "Bosch",
    categoria: "Routers",
    tarifa_dia: 12_000,
  });

  this.ultimoCarrito = await this.agregarItemCarrito.ejecutar(this.usuarioActualId, {
    modelo_id: this.herramientaRecomendada.id,
    cantidad: 1,
  });
  this.itemCarritoId = this.ultimoCarrito.items[0].id;
});

When('hago clic en el botón "+"', async function (this: ToolboxWorld) {
  // El "+" del frontend incrementa en 1 la cantidad actual y llama
  // PATCH /cart/items/{id} con la nueva cantidad — se representa acá
  // invocando ActualizarCantidadCarritoUseCase directo (ver comentario de
  // cabecera).
  const cantidadActual = this.ultimoCarrito!.items[0].cantidad;
  this.ultimoCarrito = await this.actualizarCantidadCarrito.ejecutar(
    this.usuarioActualId,
    this.itemCarritoId!,
    cantidadActual + 1,
  );
});

Then("la cantidad aumenta a 2", function (this: ToolboxWorld) {
  assert.equal(this.ultimoCarrito!.items[0].cantidad, 2);
});

Then(
  "el subtotal del ítem y el total general del carrito se recalculan automáticamente.",
  function (this: ToolboxWorld) {
    const tarifaDia = this.herramientaRecomendada!.tarifa_dia;
    // Sin `dias` en la línea → venta (mismo criterio de
    // cart-pricing.service.ts: cae a tarifa_dia como aproximación de venta
    // porque el modelo no tiene costo_compra cargado).
    assert.equal(this.ultimoCarrito!.total, 2 * tarifaDia);
  },
);

Given("que tengo productos en el carrito", async function (this: ToolboxWorld) {
  this.usuarioActualId = randomUUID();
  this.rolActual = "cliente";

  this.herramientaRecomendada = await this.registrarModelo.ejecutar({
    nombre: "Amoladora Angular",
    marca: "Makita",
    categoria: "Amoladoras",
    tarifa_dia: 9_000,
  });

  // Un único producto — así el escenario también cubre "si no quedan
  // productos, se muestra la vista de carrito vacío" (última aserción del
  // Then de este mismo escenario).
  this.ultimoCarrito = await this.agregarItemCarrito.ejecutar(this.usuarioActualId, {
    modelo_id: this.herramientaRecomendada.id,
    cantidad: 1,
  });
  this.itemCarritoId = this.ultimoCarrito.items[0].id;
});

When("hago clic en el botón de eliminar de un producto", async function (this: ToolboxWorld) {
  // El botón de eliminar del frontend llama DELETE /cart/items/{id} — se
  // representa acá invocando EliminarItemCarritoUseCase directo.
  this.ultimoCarrito = await this.eliminarItemCarrito.ejecutar(this.usuarioActualId, this.itemCarritoId!);
});

Then("el producto se remueve de la lista", function (this: ToolboxWorld) {
  assert.equal(this.ultimoCarrito!.items.length, 0);
});

Then("el total general se actualiza inmediatamente", function (this: ToolboxWorld) {
  assert.equal(this.ultimoCarrito!.total, 0);
});

Then(
  'si no quedan productos, se muestra la vista de "Tu carrito está vacío" con botón "Explorar Catálogo".',
  async function (this: ToolboxWorld) {
    // La vista de "carrito vacío" es responsabilidad del frontend — desde
    // el backend se verifica la precondición que la habilita: GET /cart
    // (ObtenerCarritoUseCase) devuelve el carrito realmente vacío, no solo
    // la respuesta del DELETE.
    const carritoPersistido = await this.obtenerCarrito.ejecutar(this.usuarioActualId);
    assert.equal(carritoPersistido.items.length, 0);
    assert.equal(carritoPersistido.total, 0);
  },
);
