import { Order } from './order.models';

/**
 * Contrato de `GET /cart` / `POST /cart/add-item` / `PATCH`-`DELETE
 * /cart/items/{id}` (openapi.yaml, tag "Carrito y Conserje de Voz"). El
 * Agente 3 agrega ítems al carrito vía el backend (`POST /cart/add-item`,
 * reenviando el JWT del propio Cliente) — el frontend nunca llama ese
 * endpoint durante una sesión de voz, solo refresca el carrito con
 * `GET /cart` para reflejar lo que el agente ya agregó (ver
 * `core/cart/cart.service.ts`).
 *
 * `id` (Sprint 13, HU-12.3): id de la línea, asignado por el backend. Nunca
 * se manda en `POST /cart/add-item` (`readOnly` en el schema), pero SIEMPRE
 * viene presente en las líneas de cualquier `Cart` devuelto por el backend —
 * es necesario para `PATCH`/`DELETE /cart/items/{id}`.
 */
export interface CartItem {
  id?: string;
  modelo_id: string;
  cantidad: number;
  dias?: number;
}

export interface Cart {
  items: CartItem[];
  total?: number;
}

/** Body de `POST /orders/checkout-cart` (HU-12.3, Fase 3). */
export interface CheckoutCartInput {
  direccion_entrega: string;
  zona_id: string;
  return_mode?: 'en_sede' | 'recogida_domicilio';
}

/** Motivo de fallo de una línea del carrito que no pudo convertirse en orden (best-effort). */
export interface CheckoutCartFallo {
  modelo_id: string;
  motivo: string;
}

/** Respuesta de `POST /orders/checkout-cart` — éxitos y fallos parciales por línea. */
export interface CheckoutCartResult {
  ordenes_creadas: Order[];
  fallos: CheckoutCartFallo[];
}
