import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ActiveOrdersComponent } from './active-orders.component';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';
import { Order } from '../../core/models/order.models';

function ordenDe(overrides: Partial<Order>): Order {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    numero_orden: 'TJL0000001',
    cliente_id: 'cliente-1',
    tipo: 'alquiler',
    estado: 'confirmada',
    fecha_inicio: '2026-09-01',
    fecha_fin: '2026-09-05',
    direccion_entrega: 'Calle 1',
    zona_id: 'zona-1',
    ...overrides,
  };
}

describe('ActiveOrdersComponent', () => {
  let fixture: ComponentFixture<ActiveOrdersComponent>;
  let httpMock: HttpTestingController;

  function configurar(autenticado: boolean): void {
    TestBed.configureTestingModule({
      imports: [ActiveOrdersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: () => autenticado } },
      ],
    });
    fixture = TestBed.createComponent(ActiveOrdersComponent);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('sin sesión, no renderiza la sección ni hace ninguna llamada HTTP', () => {
    configurar(false);
    fixture.detectChanges();

    httpMock.expectNone(`${environment.apiUrl}/orders`);
    expect(fixture.nativeElement.querySelector('[data-testid="active-orders"]')).toBeNull();
  });

  it('con sesión, filtra a solo confirmada/en_curso y ordena por fecha descendente', () => {
    configurar(true);
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`);
    req.flush({
      items: [
        ordenDe({ id: 'a', estado: 'confirmada', fecha_inicio: '2026-09-01' }),
        ordenDe({ id: 'b', estado: 'pendiente_pago', fecha_inicio: '2026-09-10' }),
        ordenDe({ id: 'c', estado: 'en_curso', fecha_inicio: '2026-09-05' }),
        ordenDe({ id: 'd', estado: 'cancelada', fecha_inicio: '2026-09-15' }),
      ],
      total: 4,
      page: 1,
      pageSize: 100,
    });
    fixture.detectChanges();

    const ids = fixture.componentInstance.orders().map((o) => o.id);
    expect(ids).toEqual(['c', 'a']);
  });

  it('setea un mensaje de error si falla la carga', () => {
    configurar(true);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush(
      { message: 'error' },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe('No pudimos cargar tus pedidos activos.');
  });

  it('no muestra el UUID de la orden y sí el modo de retorno en la fila', () => {
    configurar(true);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
      items: [
        ordenDe({
          id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          estado: 'confirmada',
          return_mode: 'recogida_domicilio',
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    fixture.detectChanges();

    const filaTexto = (fixture.nativeElement as HTMLElement).querySelector('.order-row')!.textContent!;
    expect(filaTexto).not.toContain('aaaaaaaa');
    expect(filaTexto).toContain('Recogida a domicilio');
  });

  it('al hacer click en el botón de Estado, abre el detalle de la orden con sus ítems (solo lectura)', () => {
    configurar(true);
    fixture.detectChanges();

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
      items: [
        ordenDe({
          id: 'a',
          estado: 'confirmada',
          items: [
            {
              id: 'item-1',
              order_id: 'a',
              unidad_id: 'unidad-1',
              tarifa_aplicada: 25000,
              herramienta_nombre: 'Taladro Percutor',
            },
          ],
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('dialog[data-testid="order-detail-dialog"]')).toBeNull();

    const boton = nativeElement.querySelector<HTMLButtonElement>('.order-badge')!;
    boton.click();
    fixture.detectChanges();

    const dialog = nativeElement.querySelector<HTMLDialogElement>('dialog[data-testid="order-detail-dialog"]')!;
    expect(dialog.open).toBeTrue();
    expect(dialog.textContent).toContain('TJL0000001');
    const itemsTexto = nativeElement.querySelector('[data-testid="order-items"]')!.textContent!;
    expect(itemsTexto).toContain('Taladro Percutor');
    expect(itemsTexto).toContain('25,000');
    expect(itemsTexto).not.toContain('unidad-1');
  });

  it('goToPage(2) sigue pidiéndole al backend su página 1 (no su página 2) — la paginación es solo del lado del cliente', () => {
    configurar(true);
    fixture.detectChanges();

    // 12 órdenes activas — más de una PAGE_SIZE (5) del cliente, para que
    // haya una página 2 real que probar.
    const doceOrdenes = Array.from({ length: 12 }, (_, i) =>
      ordenDe({
        id: `orden-${i + 1}`,
        estado: 'confirmada',
        fecha_inicio: `2026-09-${String(i + 1).padStart(2, '0')}`,
      }),
    );

    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
      items: doceOrdenes,
      total: 12,
      page: 1,
      pageSize: 100,
    });
    fixture.detectChanges();

    // Página 1 (orden descendente por fecha_inicio): las 5 más recientes.
    expect(fixture.componentInstance.orders().map((o) => o.id)).toEqual([
      'orden-12',
      'orden-11',
      'orden-10',
      'orden-9',
      'orden-8',
    ]);
    expect(fixture.componentInstance.totalPages()).toBe(3);

    fixture.componentInstance.goToPage(2);

    // Bug real (2026-09-09): esto pedía page=2 al backend, que con
    // pageSize=100 y menos de 100 órdenes totales devuelve items: [] —
    // "no hay pedidos activos" en la página 2 aunque sí haya.
    const segundaReq = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`);
    expect(segundaReq.request.params.get('page')).toBe('1');
    segundaReq.flush({ items: doceOrdenes, total: 12, page: 1, pageSize: 100 });
    fixture.detectChanges();

    expect(fixture.componentInstance.orders().map((o) => o.id)).toEqual([
      'orden-7',
      'orden-6',
      'orden-5',
      'orden-4',
      'orden-3',
    ]);
  });

  // HU-12.3: órdenes creadas por POST /orders/checkout-cart quedan en
  // "pendiente_pago" (ese endpoint no inicia el pago, ver CheckoutCartUseCase)
  // — sin esta sección no había ninguna pantalla para completarlo.
  describe('Pedidos pendientes de pago', () => {
    it('lista las órdenes pendiente_pago del mismo GET /orders (sin llamada aparte)', () => {
      configurar(true);
      fixture.detectChanges();

      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
        items: [
          ordenDe({ id: 'a', estado: 'confirmada' }),
          ordenDe({ id: 'b', estado: 'pendiente_pago' }),
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      });
      fixture.detectChanges();

      expect(fixture.componentInstance.pendingOrders().map((o) => o.id)).toEqual(['b']);
      const nativeElement = fixture.nativeElement as HTMLElement;
      const seccion = nativeElement.querySelector('[data-testid="pending-orders"]');
      expect(seccion).not.toBeNull();
      expect(seccion!.querySelector('[data-testid="pagar-pendiente"]')).not.toBeNull();
    });

    it('no muestra la sección si no hay pedidos pendientes de pago', () => {
      configurar(true);
      fixture.detectChanges();

      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
        items: [ordenDe({ id: 'a', estado: 'confirmada' })],
        total: 1,
        page: 1,
        pageSize: 100,
      });
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="pending-orders"]')).toBeNull();
    });

    it('el botón "Pagar" abre el modal con el pago embebido y, al completarse, refresca las listas', () => {
      configurar(true);
      fixture.detectChanges();

      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
        items: [ordenDe({ id: 'b', estado: 'pendiente_pago' })],
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

      fixture.componentInstance.onOrderPaid();
      fixture.detectChanges();

      expect(fixture.componentInstance.selectedOrder()).toBeNull();
      httpMock.expectOne((r) => r.url === `${environment.apiUrl}/orders`).flush({
        items: [ordenDe({ id: 'b', estado: 'confirmada' })],
        total: 1,
        page: 1,
        pageSize: 100,
      });
    });
  });
});
