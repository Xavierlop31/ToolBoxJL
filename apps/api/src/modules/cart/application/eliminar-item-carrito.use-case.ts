import { Inject, Injectable } from "@nestjs/common";
import type { Cart } from "@toolboxjl/shared-types";
import { TOOL_MODEL_REPOSITORY } from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import { aCartItemDto } from "../domain/cart-item.mapper";
import { calcularTotalCarrito, cargarModelosDelCarrito } from "../domain/cart-pricing.service";
import type { CartRepository } from "../domain/cart.repository";
import { LineaCarritoNoEncontradaError } from "../domain/errors/linea-carrito-no-encontrada.error";
import { CART_REPOSITORY } from "../infrastructure/cart.tokens";

/**
 * DELETE /cart/items/{id} (HU-12.3, Fase 3, Issue #146). Elimina UNA línea
 * del carrito del cliente autenticado, identificada por el `id` de la línea.
 * Reusado también por `CheckoutCartUseCase` para retirar del carrito las
 * líneas que sí se pudieron confirmar como orden (checkout best-effort).
 *
 * Anti-enumeración: mismo criterio que `ActualizarCantidadCarritoUseCase`
 * (ver su comentario de cabecera) — la línea se busca siempre dentro del
 * carrito propio del cliente autenticado.
 */
@Injectable()
export class EliminarItemCarritoUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carritos: CartRepository,
    @Inject(TOOL_MODEL_REPOSITORY) private readonly modelos: ToolModelRepository,
  ) {}

  async ejecutar(clienteId: string, itemId: string): Promise<Cart> {
    const carritoActual = await this.carritos.obtenerOCrearPorClienteId(clienteId);
    const existe = carritoActual.items.some((item) => item.id === itemId);
    if (!existe) {
      throw new LineaCarritoNoEncontradaError(itemId);
    }

    const items = carritoActual.items.filter((item) => item.id !== itemId);
    const carritoActualizado = await this.carritos.guardarItems(clienteId, items);
    const modelosPorId = await cargarModelosDelCarrito(this.modelos, carritoActualizado.items);

    return {
      items: carritoActualizado.items.map(aCartItemDto),
      total: calcularTotalCarrito(carritoActualizado.items, modelosPorId),
    };
  }
}
