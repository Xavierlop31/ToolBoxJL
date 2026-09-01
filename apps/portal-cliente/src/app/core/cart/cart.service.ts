import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Cart, CartItem, CheckoutCartInput, CheckoutCartResult } from '../models/cart.models';

/**
 * Carrito del Cliente autenticado (`GET /cart`, openapi.yaml).
 *
 * Sprint 9 (HU-10.1/10.2): portal-cliente todavía no tiene un ícono de
 * carrito en un header/layout propio (no existe ningún componente de header
 * en `apps/portal-cliente/src/app` a la fecha de este sprint — ver ADR en
 * `features/voice-widget/voice-widget.component.ts`), así que este servicio
 * expone un signal con la cuenta de ítems para que CUALQUIER consumidor
 * futuro (un header real, Sprint 10 con el diseño visual final de Stitch)
 * pueda mostrar el badge sin duplicar la llamada HTTP. Por ahora el único
 * consumidor es el propio widget de voz, que llama `refresh()` al cerrar la
 * sesión (y periódicamente mientras está abierta) para reflejar los ítems
 * que el Agente 3 haya agregado vía `POST /cart/add-item` (lo hace el
 * backend de voz, nunca este frontend).
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly cartSignal = signal<Cart | null>(null);

  /** Último carrito conocido, o `null` si todavía no se pidió ninguno. */
  readonly cart = this.cartSignal.asReadonly();
  /** Cantidad total de unidades en el carrito (suma de `cantidad` de cada ítem). */
  readonly itemCount = computed(
    () => this.cartSignal()?.items?.reduce((total, item) => total + item.cantidad, 0) ?? 0,
  );

  /** Pide `GET /cart` y actualiza el signal `cart`/`itemCount`. */
  refresh(): Observable<Cart> {
    return this.http
      .get<Cart>(`${this.apiUrl}/cart`)
      .pipe(tap((cart) => this.cartSignal.set(cart)));
  }

  /**
   * `POST /cart/add-item` (HU-12.2, alcance mínimo — Sprint 12). Actualiza
   * el signal `cart`/`itemCount` con el carrito ya actualizado que devuelve
   * el backend, igual que `refresh()`.
   */
  addItem(modeloId: string, cantidad: number, dias?: number): Observable<Cart> {
    const body: CartItem = {
      modelo_id: modeloId,
      cantidad,
      ...(dias ? { dias } : {}),
    };
    return this.http
      .post<Cart>(`${this.apiUrl}/cart/add-item`, body)
      .pipe(tap((cart) => this.cartSignal.set(cart)));
  }

  /**
   * `PATCH /cart/items/{id}` (HU-12.3, Sprint 13). `itemId` es `CartItem.id`
   * (la línea), no el `modelo_id`. Actualiza el signal `cart`/`itemCount`
   * con el carrito ya actualizado que devuelve el backend, igual que
   * `refresh()`/`addItem()`.
   */
  updateItemQuantity(itemId: string, cantidad: number): Observable<Cart> {
    return this.http
      .patch<Cart>(`${this.apiUrl}/cart/items/${itemId}`, { cantidad })
      .pipe(tap((cart) => this.cartSignal.set(cart)));
  }

  /**
   * `DELETE /cart/items/{id}` (HU-12.3, Sprint 13). `itemId` es
   * `CartItem.id` (la línea), no el `modelo_id`.
   */
  removeItem(itemId: string): Observable<Cart> {
    return this.http
      .delete<Cart>(`${this.apiUrl}/cart/items/${itemId}`)
      .pipe(tap((cart) => this.cartSignal.set(cart)));
  }

  /**
   * `POST /orders/checkout-cart` (HU-12.3, Sprint 13) — procesa TODAS las
   * líneas del carrito activo de una sola vez (best-effort: una línea que
   * falle no cancela las demás). El shape de `CheckoutCartResult`
   * (`{ordenes_creadas, fallos}`) NO es un `Cart`, así que a diferencia de
   * `refresh()`/`addItem()`/`updateItemQuantity()`/`removeItem()` esta
   * llamada no actualiza el signal `cart` — el consumidor (`CartPageComponent`)
   * llama `refresh()` explícitamente después para reflejar qué líneas quedaron
   * (las que fallaron siguen en el carrito, las exitosas ya no).
   */
  checkoutCart(
    direccionEntrega: string,
    zonaId: string,
    returnMode?: 'en_sede' | 'recogida_domicilio',
  ): Observable<CheckoutCartResult> {
    const body: CheckoutCartInput = {
      direccion_entrega: direccionEntrega,
      zona_id: zonaId,
      ...(returnMode ? { return_mode: returnMode } : {}),
    };
    return this.http.post<CheckoutCartResult>(`${this.apiUrl}/orders/checkout-cart`, body);
  }
}
