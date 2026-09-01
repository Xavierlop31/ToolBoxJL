import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { CartPageComponent } from './cart-page.component';
import { environment } from '../../../environments/environment';

describe('CartPageComponent', () => {
  let fixture: ComponentFixture<CartPageComponent>;
  let component: CartPageComponent;
  let httpMock: HttpTestingController;

  const modeloTaladro = {
    id: 'modelo-taladro',
    nombre: 'Taladro Percutor',
    marca: 'DeWalt',
    categoria: 'Perforación',
    tarifa_dia: 25000,
    tarifa_semana: 150000,
  };

  const modeloEsmeril = {
    id: 'modelo-esmeril',
    nombre: 'Esmeril Angular',
    marca: 'Makita',
    categoria: 'Corte',
    tarifa_dia: 15000,
    costo_compra: 300000,
  };

  function flushCartAndModels(cartItems: unknown[], total?: number): void {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/cart`).flush({ items: cartItems, total });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CartPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // RouterLink (botones "Explorar Catálogo"/"Seguir Comprando") inyecta
        // ActivatedRoute internamente aunque el componente no lea la ruta.
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}) } },
        },
      ],
    });

    fixture = TestBed.createComponent(CartPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('ngOnInit — listado enriquecido', () => {
    it('con el carrito vacío, no pide ningún modelo y queda en estado "vacío"', () => {
      flushCartAndModels([], 0);

      expect(component.loading()).toBe(false);
      expect(component.lineas()).toEqual([]);
    });

    it('enriquece cada línea con su modelo y calcula el subtotal (alquiler y venta)', () => {
      flushCartAndModels(
        [
          { id: 'item-1', modelo_id: 'modelo-taladro', cantidad: 2, dias: 3 },
          { id: 'item-2', modelo_id: 'modelo-esmeril', cantidad: 1 },
        ],
        155000 + 300000,
      );

      httpMock
        .expectOne(`${environment.apiUrl}/catalog/models/modelo-taladro`)
        .flush(modeloTaladro);
      httpMock
        .expectOne(`${environment.apiUrl}/catalog/models/modelo-esmeril`)
        .flush(modeloEsmeril);

      expect(component.loading()).toBe(false);
      const lineas = component.lineas();
      expect(lineas.length).toBe(2);

      const lineaAlquiler = lineas.find((l) => l.id === 'item-1');
      expect(lineaAlquiler?.esAlquiler).toBe(true);
      // 3 días < 7 -> tarifa_dia * dias * cantidad = 25000 * 3 * 2 = 150000
      expect(lineaAlquiler?.subtotal).toBe(150000);

      const lineaVenta = lineas.find((l) => l.id === 'item-2');
      expect(lineaVenta?.esAlquiler).toBe(false);
      // sin dias -> costo_compra * cantidad = 300000 * 1
      expect(lineaVenta?.subtotal).toBe(300000);

      expect(component.subtotalAlquileres()).toBe(150000);
      expect(component.subtotalVentas()).toBe(300000);
      expect(component.granTotal()).toBe(450000);
    });

    it('si falla la carga del carrito, setea un mensaje de error', () => {
      fixture.detectChanges();
      httpMock
        .expectOne(`${environment.apiUrl}/cart`)
        .flush('error', { status: 500, statusText: 'Server Error' });

      expect(component.errorMessage()).toBe('No pudimos cargar tu carrito.');
      expect(component.loading()).toBe(false);
    });
  });

  describe('increaseQuantity / decreaseQuantity', () => {
    beforeEach(() => {
      flushCartAndModels([{ id: 'item-1', modelo_id: 'modelo-taladro', cantidad: 1, dias: 3 }]);
      httpMock
        .expectOne(`${environment.apiUrl}/catalog/models/modelo-taladro`)
        .flush(modeloTaladro);
    });

    it('el botón "+" llama PATCH /cart/items/:id con cantidad+1 y recalcula el subtotal', () => {
      const linea = component.lineas()[0];
      component.increaseQuantity(linea);

      const req = httpMock.expectOne(`${environment.apiUrl}/cart/items/item-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ cantidad: 2 });

      req.flush({ items: [{ id: 'item-1', modelo_id: 'modelo-taladro', cantidad: 2, dias: 3 }] });
      httpMock
        .expectOne(`${environment.apiUrl}/catalog/models/modelo-taladro`)
        .flush(modeloTaladro);

      expect(component.lineas()[0].cantidad).toBe(2);
      // 3 días * 25000 * 2 = 150000
      expect(component.lineas()[0].subtotal).toBe(150000);
    });

    it('decreaseQuantity no llama a la API si la cantidad ya es 1', () => {
      const linea = component.lineas()[0];
      expect(linea.cantidad).toBe(1);
      component.decreaseQuantity(linea);

      httpMock.expectNone(`${environment.apiUrl}/cart/items/item-1`);
    });
  });

  describe('removeItem', () => {
    it('elimina la línea y, si el carrito queda vacío, muestra el estado vacío', () => {
      flushCartAndModels([{ id: 'item-1', modelo_id: 'modelo-taladro', cantidad: 1, dias: 3 }]);
      httpMock
        .expectOne(`${environment.apiUrl}/catalog/models/modelo-taladro`)
        .flush(modeloTaladro);

      const linea = component.lineas()[0];
      component.removeItem(linea);

      const req = httpMock.expectOne(`${environment.apiUrl}/cart/items/item-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ items: [] });

      expect(component.lineas()).toEqual([]);
    });
  });

  describe('checkout consolidado', () => {
    beforeEach(() => {
      flushCartAndModels([{ id: 'item-1', modelo_id: 'modelo-taladro', cantidad: 1, dias: 3 }]);
      httpMock
        .expectOne(`${environment.apiUrl}/catalog/models/modelo-taladro`)
        .flush(modeloTaladro);
    });

    it('abrirCheckout carga zonas de la ciudad seleccionada por defecto', () => {
      component.abrirCheckout();

      expect(component.showCheckoutForm()).toBe(true);
      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/zones` && r.params.get('ciudad') === 'Bogotá',
      );
      req.flush([{ id: 'zona-1', nombre: 'Zona Norte', ciudad: 'Bogotá' }]);

      expect(component.zonas().length).toBe(1);
    });

    it('confirmarCheckout no llama a la API si el formulario es inválido', () => {
      component.abrirCheckout();
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/zones`).flush([]);

      component.confirmarCheckout();

      expect(component.checkoutForm.get('direccionEntrega')?.touched).toBe(true);
      httpMock.expectNone(`${environment.apiUrl}/orders/checkout-cart`);
    });

    it('con éxito total, muestra la confirmación y recarga el carrito (ya vacío)', () => {
      component.abrirCheckout();
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/zones`).flush([]);

      component.checkoutForm.setValue({
        direccionEntrega: 'Calle Falsa 123',
        zonaId: 'zona-1',
      });
      component.confirmarCheckout();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/checkout-cart`);
      expect(req.request.body).toEqual({
        direccion_entrega: 'Calle Falsa 123',
        zona_id: 'zona-1',
      });
      req.flush({
        ordenes_creadas: [{ id: 'order-1' }],
        fallos: [],
      });

      // confirmarCheckout() recarga el carrito tras el resultado.
      httpMock.expectOne(`${environment.apiUrl}/cart`).flush({ items: [] });

      expect(component.checkoutResult()?.ordenes_creadas.length).toBe(1);
      expect(component.checkoutLoading()).toBe(false);
      expect(component.lineas()).toEqual([]);
    });

    it('con fallo parcial, muestra el motivo y las líneas fallidas siguen en el carrito', () => {
      component.abrirCheckout();
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/zones`).flush([]);

      component.checkoutForm.setValue({
        direccionEntrega: 'Calle Falsa 123',
        zonaId: 'zona-1',
      });
      component.confirmarCheckout();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/checkout-cart`);
      req.flush({
        ordenes_creadas: [],
        fallos: [{ modelo_id: 'modelo-taladro', motivo: 'Sin unidades disponibles' }],
      });

      httpMock
        .expectOne(`${environment.apiUrl}/cart`)
        .flush({ items: [{ id: 'item-1', modelo_id: 'modelo-taladro', cantidad: 1, dias: 3 }] });
      httpMock
        .expectOne(`${environment.apiUrl}/catalog/models/modelo-taladro`)
        .flush(modeloTaladro);

      expect(component.checkoutResult()?.fallos).toEqual([
        { modelo_id: 'modelo-taladro', motivo: 'Sin unidades disponibles' },
      ]);
      expect(component.lineas().length).toBe(1);
    });

    it('si el checkout falla, muestra el mensaje de error del backend', () => {
      component.abrirCheckout();
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/zones`).flush([]);

      component.checkoutForm.setValue({
        direccionEntrega: 'Calle Falsa 123',
        zonaId: 'zona-1',
      });
      component.confirmarCheckout();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/checkout-cart`);
      req.flush(
        { message: 'No pudimos procesar el pedido.' },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(component.checkoutError()).toBe('No pudimos procesar el pedido.');
      expect(component.checkoutLoading()).toBe(false);
    });
  });
});
