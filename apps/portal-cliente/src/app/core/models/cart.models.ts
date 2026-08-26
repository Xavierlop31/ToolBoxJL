/**
 * Contrato de `GET /cart` / `POST /cart/add-item` (openapi.yaml, tag
 * "Carrito y Conserje de Voz"). El Agente 3 agrega ítems al carrito vía el
 * backend (`POST /cart/add-item`, reenviando el JWT del propio Cliente) —
 * el frontend nunca llama ese endpoint durante una sesión de voz, solo
 * refresca el carrito con `GET /cart` para reflejar lo que el agente ya
 * agregó (ver `core/cart/cart.service.ts`).
 */
export interface CartItem {
  modelo_id: string;
  cantidad: number;
  dias?: number;
}

export interface Cart {
  items: CartItem[];
  total?: number;
}
