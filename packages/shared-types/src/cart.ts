import type { ModoRetorno, Order } from "./order";

/**
 * Carrito de compras — Sprint 9 (Issues #26/#27, HU-10.1/10.2, Agente 3:
 * Conserje de Voz). Contrato de API: openapi.yaml
 * `#/components/schemas/Cart` y `#/components/schemas/CartItem`.
 *
 * Un carrito por cliente (1:1 con `usuario.id` del JWT) — no hay
 * multi-carrito por cliente en este sprint (ver
 * apps/api/src/modules/cart/domain/cart.repository.ts).
 *
 * `CartItem` NO distingue "alquiler" vs "venta" con un campo explícito
 * (mismo criterio que openapi.yaml): se infiere server-side de la presencia
 * de `dias` — ver apps/api/src/modules/cart/domain/cart-pricing.service.ts
 * para el detalle y las decisiones documentadas (no confirmadas con el
 * Arquitecto, pero consistentes con PricingCalculatorService/Sprint 2).
 */
export interface CartItem {
  /**
   * Id de la línea (Sprint 13, HU-12.3, openapi.yaml — `readOnly`). Ausente
   * en el body de `POST /cart/add-item` (el backend lo asigna), siempre
   * presente en las respuestas que devuelven `Cart`; necesario para
   * `PATCH`/`DELETE /cart/items/{id}`.
   */
  id?: string;
  modelo_id: string;
  cantidad: number;
  dias?: number;
}

/** `total` SIEMPRE se recalcula server-side (CartPricingService) — nunca se confía en un total enviado por el cliente/Agente 3. */
export interface Cart {
  items: CartItem[];
  total: number;
}

/** Body de `POST /orders/checkout-cart` (HU-12.3, Fase 3). */
export interface CheckoutCartInput {
  direccion_entrega: string;
  zona_id: string;
  return_mode?: ModoRetorno;
}

/**
 * Respuesta de `POST /orders/checkout-cart` (HU-12.3, Fase 3) — éxitos y
 * fallos parciales por línea (checkout best-effort, NO transaccional; ver
 * `CheckoutCartUseCase`).
 */
export interface CheckoutCartResult {
  ordenes_creadas: Order[];
  fallos: { modelo_id: string; motivo: string }[];
}
