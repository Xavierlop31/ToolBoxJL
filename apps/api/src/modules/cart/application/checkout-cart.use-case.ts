import { Inject, Injectable } from "@nestjs/common";
import type { CheckoutCartInput, CheckoutCartResult, OrderInput } from "@toolboxjl/shared-types";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { CrearOrdenUseCase } from "../../orders/application/crear-orden.use-case";
import { SinUnidadesDisponiblesError } from "../../orders/domain/errors/sin-unidades-disponibles.error";
import type { CartLineItem, CartRepository } from "../domain/cart.repository";
import { CART_REPOSITORY } from "../infrastructure/cart.tokens";
import { EliminarItemCarritoUseCase } from "./eliminar-item-carrito.use-case";

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * POST /orders/checkout-cart (HU-12.3, Fase 3, Issue #146). Procesa TODAS
 * las líneas del carrito activo del cliente autenticado de una sola vez,
 * con la misma `direccion_entrega`/`zona_id` para todas (checkout
 * consolidado, botón "Proceder al Pago" del carrito) — reusa
 * `CrearOrdenUseCase` (Sprint 2) una vez por línea, en vez de reimplementar
 * su lógica de selección de unidad física + cotización.
 *
 * **Best effort, NO transaccional** (openapi.yaml, descripción del path):
 * una línea que falle (`ModeloNoEncontradoError`, `SinUnidadesDisponiblesError`)
 * no cancela las demás. Las líneas creadas exitosamente se retiran del
 * carrito (vía `EliminarItemCarritoUseCase`, misma lógica que
 * `DELETE /cart/items/{id}`); las que fallaron quedan en el carrito para
 * que el cliente las reintente o elimine manualmente. No inicia el pago —
 * eso sigue siendo `POST /orders/{id}/pay` por cada orden resultante.
 *
 * Decisiones documentadas del Backend Developer (Sprint 13, no confirmadas
 * con el Arquitecto — flag si difieren de lo esperado):
 * 1. Una orden por LÍNEA del carrito, no por unidad de `cantidad` —
 *    `OrderInput`/`CrearOrdenUseCase` no tienen un campo `cantidad`, solo
 *    eligen una única unidad física por orden (mismo criterio de
 *    `POST /orders`). openapi.yaml ("reutiliza la misma lógica de
 *    CrearOrdenUseCase, una vez por línea") confirma este criterio.
 * 2. `tipo` se infiere de la presencia de `dias` en la línea, mismo
 *    criterio que `cart-pricing.service.ts` (líneas 14-32).
 * 3. `CartLineItem` no tiene `fecha_inicio`/`fecha_fin` (solo una duración
 *    en `dias`) — para líneas de alquiler se sintetizan acá: `fecha_inicio`
 *    = hoy, `fecha_fin` = hoy + `dias`, asumiendo que el alquiler arranca
 *    inmediatamente al confirmar el checkout.
 * 4. `return_mode` es opcional en el contrato de este endpoint (a
 *    diferencia de `OrderInput.return_mode`, obligatorio) — si no se
 *    informa, se asume `"en_sede"` (mismo default que usa
 *    `CotizarOrdenUseCase` cuando no recibe `returnMode`).
 */
@Injectable()
export class CheckoutCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carritos: CartRepository,
    private readonly crearOrden: CrearOrdenUseCase,
    private readonly eliminarItemCarrito: EliminarItemCarritoUseCase,
  ) {}

  async ejecutar(clienteId: string, input: CheckoutCartInput): Promise<CheckoutCartResult> {
    const carrito = await this.carritos.obtenerOCrearPorClienteId(clienteId);

    const ordenesCreadas: CheckoutCartResult["ordenes_creadas"] = [];
    const fallos: CheckoutCartResult["fallos"] = [];

    for (const item of carrito.items) {
      try {
        const orden = await this.crearOrden.ejecutar(clienteId, this.aOrderInput(item, input));
        ordenesCreadas.push(orden);
        // Solo se retira la línea del carrito si la orden se creó con
        // éxito — best effort, ver comentario de cabecera.
        await this.eliminarItemCarrito.ejecutar(clienteId, item.id);
      } catch (error) {
        if (error instanceof ModeloNoEncontradoError || error instanceof SinUnidadesDisponiblesError) {
          fallos.push({ modelo_id: item.modelo_id, motivo: error.message });
          continue;
        }
        // Error inesperado (no es un fallo de negocio conocido por línea):
        // se propaga, mismo criterio que CrearOrdenUseCase/OrdersController
        // para errores fuera de ModeloNoEncontradoError/SinUnidadesDisponiblesError.
        throw error;
      }
    }

    return { ordenes_creadas: ordenesCreadas, fallos };
  }

  private aOrderInput(item: CartLineItem, input: CheckoutCartInput): OrderInput {
    const returnMode = input.return_mode ?? "en_sede";

    if (item.dias && item.dias > 0) {
      const hoy = new Date();
      const fin = new Date(hoy.getTime() + item.dias * UN_DIA_MS);
      return {
        modelo_id: item.modelo_id,
        tipo: "alquiler",
        fecha_inicio: hoy.toISOString().slice(0, 10),
        fecha_fin: fin.toISOString().slice(0, 10),
        return_mode: returnMode,
        direccion_entrega: input.direccion_entrega,
        zona_id: input.zona_id,
      };
    }

    return {
      modelo_id: item.modelo_id,
      tipo: "venta",
      return_mode: returnMode,
      direccion_entrega: input.direccion_entrega,
      zona_id: input.zona_id,
    };
  }
}
