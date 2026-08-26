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
  modelo_id: string;
  cantidad: number;
  dias?: number;
}

/** `total` SIEMPRE se recalcula server-side (CartPricingService) — nunca se confía en un total enviado por el cliente/Agente 3. */
export interface Cart {
  items: CartItem[];
  total: number;
}
