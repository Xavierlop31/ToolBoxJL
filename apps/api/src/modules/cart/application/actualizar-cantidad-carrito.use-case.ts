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
 * PATCH /cart/items/{id} (HU-12.3, Fase 3, Issue #146). Cambia la `cantidad`
 * de UNA línea del carrito del cliente autenticado, identificada por el `id`
 * de la línea (`CartItem.id`, NO `modelo_id`) — no soporta cambiar
 * `dias`/modalidad de una línea existente (openapi.yaml, descripción del
 * path): para eso, eliminar y volver a agregar.
 *
 * Anti-enumeración: la línea se busca SIEMPRE dentro del carrito propio del
 * cliente autenticado (`obtenerOCrearPorClienteId(clienteId)`, mismo
 * criterio que el resto de CartModule) — una línea que existe pero
 * pertenece a otro cliente nunca aparece en `carritoActual.items`, así que
 * el mismo `LineaCarritoNoEncontradaError` cubre ambos casos ("no existe" y
 * "es de otro cliente") sin distinguirlos, igual que `PagarOrdenUseCase`
 * con `OrdenNoEncontradaError`.
 */
@Injectable()
export class ActualizarCantidadCarritoUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carritos: CartRepository,
    @Inject(TOOL_MODEL_REPOSITORY) private readonly modelos: ToolModelRepository,
  ) {}

  async ejecutar(clienteId: string, itemId: string, cantidad: number): Promise<Cart> {
    const carritoActual = await this.carritos.obtenerOCrearPorClienteId(clienteId);
    const indice = carritoActual.items.findIndex((item) => item.id === itemId);
    if (indice < 0) {
      throw new LineaCarritoNoEncontradaError(itemId);
    }

    const items = [...carritoActual.items];
    items[indice] = { ...items[indice], cantidad };

    const carritoActualizado = await this.carritos.guardarItems(clienteId, items);
    const modelosPorId = await cargarModelosDelCarrito(this.modelos, carritoActualizado.items);

    return {
      items: carritoActualizado.items.map(aCartItemDto),
      total: calcularTotalCarrito(carritoActualizado.items, modelosPorId),
    };
  }
}
