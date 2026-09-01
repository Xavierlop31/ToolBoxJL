import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { Cart, CartItem } from "@toolboxjl/shared-types";
import { TOOL_MODEL_REPOSITORY } from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { aCartItemDto } from "../domain/cart-item.mapper";
import { calcularTotalCarrito, cargarModelosDelCarrito } from "../domain/cart-pricing.service";
import type { CartRepository } from "../domain/cart.repository";
import { CART_REPOSITORY } from "../infrastructure/cart.tokens";

/**
 * POST /cart/add-item (HU-10.1/10.2, Issues #26/#27). Invocado directamente
 * por el Cliente o, vía tool calling, por el Agente 3 tras confirmación
 * verbal (ver openapi.yaml, descripción del path — el Agente 3 reenvía el
 * JWT del propio cliente, así que este caso de uso nunca distingue "quién"
 * llamó, solo el `clienteId` del `UsuarioAutenticado` ya resuelto por
 * `SupabaseAuthGuard`).
 *
 * Regla de negocio (openapi.yaml, comentario del path): si el `modelo_id` ya
 * está en el carrito, SUMA la cantidad en vez de duplicar la línea. `dias`
 * del nuevo pedido reemplaza al anterior si viene informado (ej. el cliente
 * pide "y también 3 días más de esa" — se asume que el último `dias`
 * explícito es el vigente); si el nuevo pedido no informa `dias`, se
 * conserva el que ya tenía la línea.
 */
@Injectable()
export class AgregarItemCarritoUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carritos: CartRepository,
    @Inject(TOOL_MODEL_REPOSITORY) private readonly modelos: ToolModelRepository,
  ) {}

  async ejecutar(clienteId: string, itemInput: CartItem): Promise<Cart> {
    const modelo = await this.modelos.buscarPorId(itemInput.modelo_id);
    if (!modelo) {
      throw new ModeloNoEncontradoError(itemInput.modelo_id);
    }

    const carritoActual = await this.carritos.obtenerOCrearPorClienteId(clienteId);
    const items = [...carritoActual.items];
    const indiceExistente = items.findIndex((item) => item.modelo_id === itemInput.modelo_id);

    if (indiceExistente >= 0) {
      const existente = items[indiceExistente];
      items[indiceExistente] = {
        id: existente.id,
        modelo_id: existente.modelo_id,
        cantidad: existente.cantidad + itemInput.cantidad,
        dias: itemInput.dias ?? existente.dias,
      };
    } else {
      items.push({
        // Id nuevo (Sprint 13, HU-12.3) — `guardarItems` persiste este id
        // tal cual, así queda estable para futuros `PATCH`/`DELETE
        // /cart/items/{id}` (ver comentario de `guardarItems` en
        // domain/cart.repository.ts).
        id: randomUUID(),
        modelo_id: itemInput.modelo_id,
        cantidad: itemInput.cantidad,
        dias: itemInput.dias ?? null,
      });
    }

    const carritoActualizado = await this.carritos.guardarItems(clienteId, items);
    const modelosPorId = await cargarModelosDelCarrito(this.modelos, carritoActualizado.items);
    // El modelo recién validado puede no estar en el mapa si `buscarPorId`
    // (llamado adentro de `cargarModelosDelCarrito`) no lo reencuentra por
    // alguna inconsistencia del repo in-memory/Prisma — improbable, pero se
    // agrega igual por robustez (mismo criterio que el comentario de
    // `calcularTotalCarrito`).
    if (!modelosPorId.has(modelo.id)) {
      modelosPorId.set(modelo.id, modelo);
    }

    return {
      items: carritoActualizado.items.map(aCartItemDto),
      total: calcularTotalCarrito(carritoActualizado.items, modelosPorId),
    };
  }
}
