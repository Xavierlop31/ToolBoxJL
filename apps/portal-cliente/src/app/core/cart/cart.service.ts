import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Cart, CartItem } from '../models/cart.models';

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
}
