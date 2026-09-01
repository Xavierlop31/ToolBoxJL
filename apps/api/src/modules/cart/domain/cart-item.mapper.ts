import type { CartItem } from "@toolboxjl/shared-types";
import type { CartLineItem } from "./cart.repository";

/**
 * Mapea una línea de dominio (`CartLineItem`) al DTO de API `CartItem`
 * (openapi.yaml) — usado por los 4 casos de uso de CartModule que devuelven
 * `Cart` (`ObtenerCarritoUseCase`, `AgregarItemCarritoUseCase`,
 * `ActualizarCantidadCarritoUseCase`, `EliminarItemCarritoUseCase`) para no
 * duplicar este mapeo. Incluye `id` (Sprint 13, HU-12.3) para que el cliente
 * pueda direccionar `PATCH`/`DELETE /cart/items/{id}`.
 */
export function aCartItemDto(item: CartLineItem): CartItem {
  return item.dias
    ? { id: item.id, modelo_id: item.modelo_id, cantidad: item.cantidad, dias: item.dias }
    : { id: item.id, modelo_id: item.modelo_id, cantidad: item.cantidad };
}
