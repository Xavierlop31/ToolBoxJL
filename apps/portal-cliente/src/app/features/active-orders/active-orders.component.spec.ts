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
});
