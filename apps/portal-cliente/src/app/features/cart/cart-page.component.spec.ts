import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { CartPageComponent } from './cart-page.component';
import { environment } from '../../../environments/environment';
import { Order } from '../../core/models/order.models';

function ordenDe(overrides: Partial<Order>): Order {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    numero_orden: 'TJL0000001',
    cliente_id: 'cliente-1',
    tipo: 'venta',
    estado: 'pendiente_pago',
    fecha_inicio: null,
    fecha_fin: null,
    direccion_entrega: 'Calle 1',
    zona_id: 'zona-1',
    ...overrides,
  };
}

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

  function flushOrders(pendingItems: unknown[] = []): void {
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
      items: pendingItems,
      total: pendingItems.length,
      page: 1,
      pageSize: 100,
    });
  }

  function flushCartAndModels(cartItems: unknown[], total?: number): void {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/cart`).flush({ items: cartItems, total });
    // ngOnInit también pide GET /orders para "Pedidos pendientes de pago" —
    // se drena vacío acá salvo que el test lo pruebe explícitamente.
    flushOrders();
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
      flushOrders();

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

      // confirmarCheckout() recarga el carrito Y "Pedidos pendientes de
      // pago" tras el resultado (las órdenes recién creadas quedan en
      // pendiente_pago).
      httpMock.expectOne(`${environment.apiUrl}/cart`).flush({ items: [] });
      flushOrders();

      expect(component.checkoutResult()?.ordenes_creadas.length).toBe(1);
      expect(component.checkoutLoading()).toBe(false);
      expect(component.lineas()).toEqual([]);
    });

    it('bug reportado por el Arquitecto (2026-09-11): tras el checkout exitoso, muestra un link a la sección de pendientes de pago de esta misma página (antes no había forma de continuar)', () => {
      component.abrirCheckout();
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/zones`).flush([]);

      component.checkoutForm.setValue({
        direccionEntrega: 'Calle Falsa 123',
        zonaId: 'zona-1',
      });
      component.confirmarCheckout();

      httpMock.expectOne(`${environment.apiUrl}/orders/checkout-cart`).flush({
        ordenes_creadas: [{ id: 'order-1' }],
        fallos: [],
      });
      httpMock.expectOne(`${environment.apiUrl}/cart`).flush({ items: [] });
      flushOrders([{ id: 'order-1', estado: 'pendiente_pago', tipo: 'venta', fecha_inicio: null }]);
      fixture.detectChanges();

      const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
        '[data-testid="ir-a-pagar"]',
      );
      expect(link).withContext('se esperaba un link para ir a pagar tras el checkout').not.toBeNull();
      expect(link!.getAttribute('href')).toBe('#pedidos-pendientes-pago');
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
      flushOrders();

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

  // Pedido del Arquitecto (2026-09-11): "Pedidos pendientes de pago" vivía
  // en el catálogo (ActiveOrdersComponent) mezclada con la navegación y
  // resultaba confusa — se movió acá, junto al resto del flujo de compra.
  describe('Pedidos pendientes de pago', () => {
    it('lista las órdenes pendiente_pago (GET /orders propio, filtra las demás) y ordena por fecha descendente', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/cart`).flush({ items: [] });
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
        items: [
          ordenDe({ id: 'a', estado: 'pendiente_pago', fecha_inicio: '2026-09-01' }),
          ordenDe({ id: 'b', estado: 'confirmada' }),
          ordenDe({ id: 'c', estado: 'pendiente_pago', fecha_inicio: '2026-09-10' }),
        ],
        total: 3,
        page: 1,
        pageSize: 100,
      });
      fixture.detectChanges();

      expect(component.pendingOrders().map((o) => o.id)).toEqual(['c', 'a']);
      const nativeElement = fixture.nativeElement as HTMLElement;
      const seccion = nativeElement.querySelector('[data-testid="pending-orders"]');
      expect(seccion).not.toBeNull();
      expect(seccion!.querySelectorAll('[data-testid="pagar-pendiente"]').length).toBe(2);
    });

    it('no muestra la sección si no hay pedidos pendientes de pago', () => {
      flushCartAndModels([], 0);
      fixture.detectChanges();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('[data-testid="pending-orders"]'),
      ).toBeNull();
    });

    it('el botón "Pagar" abre el modal con el pago embebido y, al completarse, refresca la lista', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/cart`).flush({ items: [] });
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
        items: [ordenDe({ id: 'b' })],
        total: 1,
        page: 1,
        pageSize: 100,
      });
      fixture.detectChanges();

      const nativeElement = fixture.nativeElement as HTMLElement;
      nativeElement.querySelector<HTMLButtonElement>('[data-testid="pagar-pendiente"]')!.click();
      fixture.detectChanges();

      expect(nativeElement.querySelector('app-order-payment')).not.toBeNull();
      // ngOnInit de OrderPaymentComponent precarga bancos PSE + términos de
      // Wompi (default "pse") — no son objeto de este test.
      httpMock.expectOne(`${environment.apiUrl}/payments/pse-banks`).flush([]);
      httpMock.expectOne(`${environment.apiUrl}/payments/wompi-terms`).flush({
        acceptance_token: 'tok-acept',
        accept_personal_auth: 'tok-datos',
        reglamento_url: 'https://wompi.co/reglamento.pdf',
        politica_datos_url: 'https://wompi.co/politica-datos.pdf',
      });

      component.onOrderPaid();
      fixture.detectChanges();

      expect(component.selectedOrder()).toBeNull();
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
        items: [ordenDe({ id: 'b', estado: 'confirmada' })],
        total: 1,
        page: 1,
        pageSize: 100,
      });
    });
  });
});
