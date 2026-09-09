import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { OrderPaymentComponent } from './order-payment.component';
import { environment } from '../../../environments/environment';
import { Order, Payment, PseBank, WompiTerms } from '../../core/models/order.models';

function wompiTermsFake(): WompiTerms {
  return {
    acceptance_token: 'tok-acept',
    accept_personal_auth: 'tok-datos',
    reglamento_url: 'https://wompi.co/reglamento.pdf',
    politica_datos_url: 'https://wompi.co/politica-datos.pdf',
  };
}

function orderFake(): Order {
  return {
    id: 'order-1',
    numero_orden: 'TJL0000001',
    cliente_id: 'cliente-1',
    tipo: 'alquiler',
    estado: 'pendiente_pago',
    fecha_inicio: '2026-09-01',
    fecha_fin: '2026-09-05',
    direccion_entrega: 'Calle Falsa 123',
    zona_id: 'zona-test-uuid',
  };
}

describe('OrderPaymentComponent', () => {
  let fixture: ComponentFixture<OrderPaymentComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderPaymentComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderPaymentComponent);
    fixture.componentRef.setInput('order', orderFake());
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * ngOnInit siempre arranca en "pse" (default de selectedMetodoPago) y
   * precarga bancos + términos de Wompi — se drena acá para que cada test
   * empiece desde un estado limpio, sin repetir esto en cada `it`.
   */
  function init(bancos: PseBank[] = [{ codigo: '1', nombre: 'Banco A' }], terminos = wompiTermsFake()): void {
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/payments/pse-banks`).flush(bancos);
    httpMock.expectOne(`${environment.apiUrl}/payments/wompi-terms`).flush(terminos);
  }

  describe('setMetodoPago', () => {
    it('actualiza el método de pago seleccionado, sin refetch de bancos/términos ya cargados', () => {
      init();
      const component = fixture.componentInstance;
      expect(component.selectedMetodoPago()).toBe('pse');

      component.setMetodoPago('tarjeta');
      expect(component.selectedMetodoPago()).toBe('tarjeta');
      httpMock.expectNone((r) => r.url.includes('/payments/pse-banks'));
      httpMock.expectNone((r) => r.url.includes('/payments/wompi-terms'));

      component.setMetodoPago('contra_entrega');
      expect(component.selectedMetodoPago()).toBe('contra_entrega');
    });

    it('no recarga bancos ni términos en selecciones repetidas', () => {
      init();
      const component = fixture.componentInstance;
      expect(component.pseBanks()).toEqual([{ codigo: '1', nombre: 'Banco A' }]);
      expect(component.wompiTerms()).toEqual(wompiTermsFake());

      component.setMetodoPago('tarjeta');
      component.setMetodoPago('pse');
      httpMock.expectNone(`${environment.apiUrl}/payments/pse-banks`);
      httpMock.expectNone(`${environment.apiUrl}/payments/wompi-terms`);
    });
  });

  describe('confirmPayment', () => {
    it('no confirma un pago PSE si falta el banco/documento — marca el form como touched', () => {
      init();
      fixture.componentInstance.confirmPayment();

      httpMock.expectNone((r) => r.url.includes('/pay'));
      expect(fixture.componentInstance.pseForm.touched).toBe(true);
    });

    it('no confirma un pago pse/tarjeta si falta aceptar el Reglamento y la Política de Datos de Wompi', () => {
      init();
      const component = fixture.componentInstance;
      component.pseForm.setValue({
        user_legal_id_type: 'CC',
        user_legal_id: '123456789',
        financial_institution_code: '1',
      });

      component.confirmPayment();

      httpMock.expectNone((r) => r.url.includes('/pay'));
      expect(component.consentimientoFaltante()).toBe(true);
    });

    it('confirma el pago exitosamente (pse), arma el body con acceptance_token/accept_personal_auth y emite "paid"', () => {
      init();
      const component = fixture.componentInstance;
      component.pseForm.setValue({
        user_legal_id_type: 'CC',
        user_legal_id: '123456789',
        financial_institution_code: '1',
      });
      component.aceptaReglamento.set(true);
      component.aceptaDatos.set(true);

      let emitido: Payment | undefined;
      component.paid.subscribe((payment) => (emitido = payment));

      component.confirmPayment();
      const req = httpMock.expectOne(`${environment.apiUrl}/orders/order-1/pay`);
      expect(req.request.body).toEqual({
        metodo: 'pse',
        user_legal_id_type: 'CC',
        user_legal_id: '123456789',
        financial_institution_code: '1',
        acceptance_token: 'tok-acept',
        accept_personal_auth: 'tok-datos',
      });

      const payment: Payment = {
        id: 'pay-1',
        order_id: 'order-1',
        tipo: 'pago_alquiler',
        metodo: 'pse',
        estado: 'capturado',
        monto: 125000,
        wompi_transaction_id: 'wompi-tx-1',
      };
      req.flush(payment);

      expect(component.paymentResult()).toEqual(payment);
      expect(component.paymentLoading()).toBe(false);
      expect(emitido).toEqual(payment);
    });

    it('contra_entrega no exige documento/banco ni consentimiento de Wompi', () => {
      init();
      const component = fixture.componentInstance;
      component.setMetodoPago('contra_entrega');

      component.confirmPayment();
      const req = httpMock.expectOne(`${environment.apiUrl}/orders/order-1/pay`);
      expect(req.request.body).toEqual({ metodo: 'contra_entrega' });

      req.flush({
        id: 'pay-1',
        order_id: 'order-1',
        tipo: 'pago_alquiler',
        metodo: 'contra_entrega',
        estado: 'pendiente',
        monto: 125000,
        wompi_transaction_id: null,
      } satisfies Payment);

      expect(component.paymentResult()?.estado).toBe('pendiente');
    });

    it('setea un error si el pago falla', () => {
      init();
      const component = fixture.componentInstance;
      component.setMetodoPago('contra_entrega');

      component.confirmPayment();
      const req = httpMock.expectOne(`${environment.apiUrl}/orders/order-1/pay`);
      req.flush('error', { status: 500, statusText: 'Server Error' });

      expect(component.paymentError()).toBe('No pudimos procesar el pago. Intenta de nuevo.');
      expect(component.paymentLoading()).toBe(false);
    });
  });
});
