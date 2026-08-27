import { Inject, Injectable } from "@nestjs/common";
import type { Cart, CartItem } from "@toolboxjl/shared-types";
import { TOOL_MODEL_REPOSITORY } from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import { calcularTotalCarrito, cargarModelosDelCarrito } from "../domain/cart-pricing.service";
import type { CartLineItem, CartRepository } from "../domain/cart.repository";
import { CART_REPOSITORY } from "../infrastructure/cart.tokens";

function aCartItemDto(item: CartLineItem): CartItem {
  return item.dias
    ? { modelo_id: item.modelo_id, cantidad: item.cantidad, dias: item.dias }
    : { modelo_id: item.modelo_id, cantidad: item.cantidad };
}

/** GET /cart (HU-10.2, Issue #27) — carrito activo del cliente autenticado, con `total` recalculado server-side. */
@Injectable()
export class ObtenerCarritoUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carritos: CartRepository,
    @Inject(TOOL_MODEL_REPOSITORY) private readonly modelos: ToolModelRepository,
  ) {}

  async ejecutar(clienteId: string): Promise<Cart> {
    const carrito = await this.carritos.obtenerOCrearPorClienteId(clienteId);
    const modelosPorId = await cargarModelosDelCarrito(this.modelos, carrito.items);

    return {
      items: carrito.items.map(aCartItemDto),
      total: calcularTotalCarrito(carrito.items, modelosPorId),
    };
  }
}
