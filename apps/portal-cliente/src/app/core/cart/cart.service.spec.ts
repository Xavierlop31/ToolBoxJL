import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('arranca sin carrito conocido y con itemCount en 0', () => {
    expect(service.cart()).toBeNull();
    expect(service.itemCount()).toBe(0);
  });

  it('refresh() llama GET /cart y actualiza cart()/itemCount()', () => {
    service.refresh().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/cart`);
    expect(req.request.method).toBe('GET');
    req.flush({
      items: [
        { modelo_id: 'm1', cantidad: 2, dias: 3 },
        { modelo_id: 'm2', cantidad: 1 },
      ],
      total: 125000,
    });

    expect(service.itemCount()).toBe(3);
    expect(service.cart()?.total).toBe(125000);
  });

  it('itemCount() es 0 con un carrito vacío', () => {
    service.refresh().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/cart`);
    req.flush({ items: [] });

    expect(service.itemCount()).toBe(0);
  });

  it('updateItemQuantity() llama PATCH /cart/items/:id y actualiza cart()', () => {
    let resultado: import('../models/cart.models').Cart | undefined;
    service.updateItemQuantity('item-1', 3).subscribe((cart) => (resultado = cart));

    const req = httpMock.expectOne(`${environment.apiUrl}/cart/items/item-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ cantidad: 3 });

    const cartActualizado = {
      items: [{ id: 'item-1', modelo_id: 'm1', cantidad: 3 }],
      total: 90000,
    };
    req.flush(cartActualizado);

    expect(resultado).toEqual(cartActualizado);
    expect(service.cart()).toEqual(cartActualizado);
    expect(service.itemCount()).toBe(3);
  });

  it('removeItem() llama DELETE /cart/items/:id y actualiza cart()', () => {
    let resultado: import('../models/cart.models').Cart | undefined;
    service.removeItem('item-1').subscribe((cart) => (resultado = cart));

    const req = httpMock.expectOne(`${environment.apiUrl}/cart/items/item-1`);
    expect(req.request.method).toBe('DELETE');

    const cartActualizado = { items: [], total: 0 };
    req.flush(cartActualizado);

    expect(resultado).toEqual(cartActualizado);
    expect(service.cart()).toEqual(cartActualizado);
    expect(service.itemCount()).toBe(0);
  });

  describe('checkoutCart', () => {
    it('llama POST /orders/checkout-cart con el body esperado', () => {
      let resultado: import('../models/cart.models').CheckoutCartResult | undefined;
      service
        .checkoutCart('Calle Falsa 123', 'zona-uuid', 'en_sede')
        .subscribe((r) => (resultado = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/checkout-cart`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        direccion_entrega: 'Calle Falsa 123',
        zona_id: 'zona-uuid',
        return_mode: 'en_sede',
      });

      const checkoutResult = {
        ordenes_creadas: [{ id: 'order-1' }],
        fallos: [],
      };
      req.flush(checkoutResult);

      expect(resultado).toEqual(checkoutResult as never);
      // checkoutCart() no toca el signal `cart` — el consumidor refresca
      // explícitamente con `refresh()` después.
      expect(service.cart()).toBeNull();
    });

    it('no manda return_mode si no se especifica', () => {
      service.checkoutCart('Calle Falsa 123', 'zona-uuid').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/checkout-cart`);
      expect(req.request.body).toEqual({
        direccion_entrega: 'Calle Falsa 123',
        zona_id: 'zona-uuid',
      });
      req.flush({ ordenes_creadas: [], fallos: [] });
    });
  });
});
