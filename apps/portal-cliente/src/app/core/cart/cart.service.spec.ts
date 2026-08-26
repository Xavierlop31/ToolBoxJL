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
});
