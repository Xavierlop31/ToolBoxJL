import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { ModelDetailComponent } from './model-detail.component';
import { environment } from '../../../environments/environment';
import { Order, Quote } from '../../core/models/order.models';
import { AuthService } from '../../core/auth/auth.service';

describe('ModelDetailComponent', () => {
  let fixture: ComponentFixture<ModelDetailComponent>;
  let httpMock: HttpTestingController;
  let paramMapId: string | null;

  const modelId = '11111111-1111-4111-8111-111111111111';

  const modelResponse = {
    id: modelId,
    nombre: 'Taladro',
    marca: 'DeWalt',
    categoria: 'Taladros',
    tarifa_dia: 25000,
    disponible_para_venta: true,
  };

  function configureTestBed(): void {
    TestBed.configureTestingModule({
      imports: [ModelDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap(paramMapId ? { id: paramMapId } : {}) },
          },
        },
        // Sprint 12 (HU-11.1, auth-wall): getQuote()/addItem() ahora exigen
        // sesión activa antes de llamar a la API. Todos los tests de este
        // archivo asumen un Cliente ya autenticado (el auth-wall en sí no es
        // lo que se testea acá) — se mockea `AuthService` en vez de simular
        // una sesión real de Supabase.
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
      ],
    }).compileComponents();
  }

  function fillValidRentalForm(): void {
    fixture.componentInstance.form.setValue({
      tipo: 'alquiler',
      fechaInicio: '2026-09-01',
      fechaFin: '2026-09-05',
      direccionEntrega: 'Calle Falsa 123',
      zonaId: 'zona-test-uuid',
    });
  }

  function loadModel(): void {
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/catalog/models/${modelId}`)
      .flush(modelResponse);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    paramMapId = modelId;
    await configureTestBed();

    fixture = TestBed.createComponent(ModelDetailComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Sprint 12 (HU-12.2): ngOnInit ahora también dispara GET /zones (carga
    // de zonas dinámicas por ciudad) además de GET /catalog/models/:id. Los
    // tests de este archivo son anteriores a ese cambio y no la conocen —
    // se drena acá en vez de tocar cada test individualmente, ya que ningún
    // test de este archivo versa sobre el comportamiento de zonas.
    httpMock
      .match((req) => req.url.includes('/zones'))
      .forEach((req) => req.flush([]));
    httpMock.verify();
  });

  describe('ngOnInit', () => {
    it('sin id en la ruta, setea error y no hace ninguna llamada HTTP', async () => {
      paramMapId = null;
      TestBed.resetTestingModule();
      await configureTestBed();
      fixture = TestBed.createComponent(ModelDetailComponent);
      httpMock = TestBed.inject(HttpTestingController);

      fixture.detectChanges();

      expect(fixture.componentInstance.errorMessage()).toBe('Modelo no encontrado.');
      expect(fixture.componentInstance.loading()).toBe(false);
      httpMock.expectNone(`${environment.apiUrl}/catalog/models/${modelId}`);
    });

    it('carga exitosamente el modelo y aplica validadores dinámicos para alquiler', () => {
      loadModel();

      const component = fixture.componentInstance;
      expect(component.model()).toEqual(modelResponse as never);
      expect(component.loading()).toBe(false);
      expect(component.errorMessage()).toBeNull();

      // Para tipo 'alquiler' las fechas son requeridas
      expect(component.form.get('fechaInicio')?.hasError('required')).toBe(true);
      expect(component.form.get('fechaFin')?.hasError('required')).toBe(true);
    });

    it('al cambiar a venta limpia los validadores de fechas', () => {
      loadModel();
      const component = fixture.componentInstance;

      component.form.get('tipo')?.setValue('venta');

      expect(component.form.get('fechaInicio')?.hasError('required')).toBe(false);
      expect(component.form.get('fechaFin')?.hasError('required')).toBe(false);
    });

    it('si falla la carga del modelo, setea un mensaje de error', () => {
      fixture.detectChanges();
      httpMock
        .expectOne(`${environment.apiUrl}/catalog/models/${modelId}`)
        .flush('error', { status: 500, statusText: 'Server Error' });

      const component = fixture.componentInstance;
      expect(component.errorMessage()).toBe('No pudimos cargar la ficha del modelo.');
      expect(component.loading()).toBe(false);
    });
  });

  describe('checkAvailability', () => {
    it('no hace nada si el modelo aún no está cargado', () => {
      fixture.detectChanges();
      // No se resuelve el httpMock del modelo -> model() sigue null
      const component = fixture.componentInstance;
      component.checkAvailability();

      expect(component.availabilityLoading()).toBe(false);
      expect(component.unidadesDisponibles()).toBeNull();
      httpMock.expectOne(`${environment.apiUrl}/catalog/models/${modelId}`);
      httpMock.expectNone(`${environment.apiUrl}/inventory/check-availability`);
    });

    it('RF-1.4: consulta disponibilidad y muestra solo unidades realmente disponibles', () => {
      loadModel();
      fillValidRentalForm();
      fixture.componentInstance.checkAvailability();

      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/inventory/check-availability`,
      );
      req.flush({ modelo_id: modelId, unidades_disponibles: 2 });

      expect(fixture.componentInstance.unidadesDisponibles()).toBe(2);
      expect(fixture.componentInstance.availabilityLoading()).toBe(false);
    });

    it('setea un error si faltan las fechas', () => {
      loadModel();
      const component = fixture.componentInstance;
      component.form.patchValue({ fechaInicio: '', fechaFin: '' });

      component.checkAvailability();

      expect(component.availabilityError()).toBe(
        'Por favor selecciona un rango de fechas válido.',
      );
      httpMock.expectNone(`${environment.apiUrl}/inventory/check-availability`);
    });

    it('auth-wall (HU-11.1): sin sesión, guarda el intento y redirige a login en vez de consultar', async () => {
      // A diferencia del resto de los tests de este archivo (sesión mockeada
      // como autenticada en configureTestBed()), este necesita el caso
      // contrario -- se reconfigura el módulo de testing con su propio
      // AuthService antes de crear el componente, mismo patrón que el test
      // "sin id en la ruta" de ngOnInit.
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ModelDetailComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { paramMap: convertToParamMap({ id: modelId }) } },
          },
          { provide: AuthService, useValue: { isAuthenticated: () => false } },
        ],
      });
      await TestBed.compileComponents();
      fixture = TestBed.createComponent(ModelDetailComponent);
      httpMock = TestBed.inject(HttpTestingController);

      loadModel();
      fillValidRentalForm();

      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

      fixture.componentInstance.checkAvailability();

      expect(navigateSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/^\/login\?returnUrl=/),
      );
      expect(fixture.componentInstance.availabilityLoading()).toBe(false);
      httpMock.expectNone(`${environment.apiUrl}/inventory/check-availability`);
    });

    it('setea un error si la consulta de disponibilidad falla', () => {
      loadModel();
      fillValidRentalForm();

      const component = fixture.componentInstance;
      component.checkAvailability();

      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/inventory/check-availability`,
      );
      req.flush('error', { status: 500, statusText: 'Server Error' });

      expect(component.availabilityError()).toBe('No pudimos consultar la disponibilidad.');
      expect(component.availabilityLoading()).toBe(false);
    });
  });

  describe('getQuote', () => {
    it('marca el formulario como touched y no llama a la API si es inválido', () => {
      loadModel();
      const component = fixture.componentInstance;
      // Formulario recién cargado: direccionEntrega y zonaId están vacíos -> inválido
      component.getQuote();

      expect(component.form.get('direccionEntrega')?.touched).toBe(true);
      expect(component.form.get('zonaId')?.touched).toBe(true);
      httpMock.expectNone(`${environment.apiUrl}/orders/quote`);
    });

    it('cotiza exitosamente para alquiler y limpia resultados previos de orden/pago', () => {
      loadModel();
      fillValidRentalForm();

      const component = fixture.componentInstance;
      component.getQuote();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/quote`);
      expect(req.request.body).toEqual({
        modelo_id: modelId,
        tipo: 'alquiler',
        direccion_entrega: 'Calle Falsa 123',
        zona_id: 'zona-test-uuid',
        fecha_inicio: '2026-09-01',
        fecha_fin: '2026-09-05',
      });

      const quote: Quote = {
        modelo_id: modelId,
        tarifa_base: 100000,
        recargo_logistico: 5000,
        deposito_garantia: 20000,
        total: 125000,
        desglose: [{ concepto: 'Tarifa base', monto: 100000 }],
      };
      req.flush(quote);

      expect(component.quoteResult()).toEqual(quote);
      expect(component.quoteLoading()).toBe(false);
    });

    it('cotiza para venta sin incluir fechas en el payload', () => {
      loadModel();
      const component = fixture.componentInstance;
      component.form.setValue({
        tipo: 'venta',
        fechaInicio: '',
        fechaFin: '',
        direccionEntrega: 'Calle Falsa 123',
        zonaId: 'zona-test-uuid',
      });

      component.getQuote();

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/quote`);
      expect(req.request.body).toEqual({
        modelo_id: modelId,
        tipo: 'venta',
        direccion_entrega: 'Calle Falsa 123',
        zona_id: 'zona-test-uuid',
      });
      req.flush({
        modelo_id: modelId,
        tarifa_base: 500000,
        recargo_logistico: 0,
        deposito_garantia: 0,
        total: 500000,
        desglose: [],
      });
      expect(component.quoteResult()?.total).toBe(500000);
    });

    it('usa el mensaje de error del backend cuando está disponible', () => {
      loadModel();
      fillValidRentalForm();
      const component = fixture.componentInstance;

      component.getQuote();
      const req = httpMock.expectOne(`${environment.apiUrl}/orders/quote`);
      req.flush(
        { message: 'No hay unidades disponibles para ese rango.' },
        { status: 409, statusText: 'Conflict' },
      );

      expect(component.quoteError()).toBe('No hay unidades disponibles para ese rango.');
      expect(component.quoteLoading()).toBe(false);
    });

    it('usa un mensaje de error genérico si el backend no provee uno', () => {
      loadModel();
      fillValidRentalForm();
      const component = fixture.componentInstance;

      component.getQuote();
      const req = httpMock.expectOne(`${environment.apiUrl}/orders/quote`);
      req.flush('error', { status: 500, statusText: 'Server Error' });

      expect(component.quoteError()).toBe(
        'No pudimos generar la cotización. Intenta de nuevo.',
      );
    });
  });

  describe('confirmOrder', () => {
    it('no hace nada si no hay modelo o cotización', () => {
      loadModel();
      const component = fixture.componentInstance;
      component.confirmOrder();

      expect(component.orderResult()).toBeNull();
      expect(component.orderLoading()).toBe(false);
      httpMock.expectNone(`${environment.apiUrl}/orders`);
    });

    it('confirma la orden exitosamente y limpia la cotización', () => {
      loadModel();
      fillValidRentalForm();
      const component = fixture.componentInstance;

      component.getQuote();
      const quoteReq = httpMock.expectOne(`${environment.apiUrl}/orders/quote`);
      quoteReq.flush({
        modelo_id: modelId,
        tarifa_base: 100000,
        recargo_logistico: 5000,
        deposito_garantia: 20000,
        total: 125000,
        desglose: [],
      });

      component.confirmOrder();
      const orderReq = httpMock.expectOne(`${environment.apiUrl}/orders`);
      expect(orderReq.request.body).toEqual({
        modelo_id: modelId,
        tipo: 'alquiler',
        direccion_entrega: 'Calle Falsa 123',
        zona_id: 'zona-test-uuid',
        fecha_inicio: '2026-09-01',
        fecha_fin: '2026-09-05',
      });

      const order: Order = {
        id: 'order-1',
        cliente_id: 'cliente-1',
        tipo: 'alquiler',
        estado: 'pendiente_pago',
        fecha_inicio: '2026-09-01',
        fecha_fin: '2026-09-05',
        direccion_entrega: 'Calle Falsa 123',
        zona_id: 'zona-test-uuid',
      };
      orderReq.flush(order);

      expect(component.orderResult()).toEqual(order);
      expect(component.quoteResult()).toBeNull();
      expect(component.orderLoading()).toBe(false);
    });

    it('setea un error si la confirmación de orden falla', () => {
      loadModel();
      fillValidRentalForm();
      const component = fixture.componentInstance;

      component.getQuote();
      const quoteReq = httpMock.expectOne(`${environment.apiUrl}/orders/quote`);
      quoteReq.flush({
        modelo_id: modelId,
        tarifa_base: 100000,
        recargo_logistico: 5000,
        deposito_garantia: 20000,
        total: 125000,
        desglose: [],
      });

      component.confirmOrder();
      const orderReq = httpMock.expectOne(`${environment.apiUrl}/orders`);
      orderReq.flush(
        { message: 'No pudimos reservar unidad.' },
        { status: 409, statusText: 'Conflict' },
      );

      expect(component.orderError()).toBe('No pudimos reservar unidad.');
      expect(component.orderLoading()).toBe(false);
    });
  });

  describe('setMetodoPago', () => {
    it('actualiza el método de pago seleccionado', () => {
      loadModel();
      const component = fixture.componentInstance;
      expect(component.selectedMetodoPago()).toBe('pse');

      component.setMetodoPago('tarjeta');
      expect(component.selectedMetodoPago()).toBe('tarjeta');

      component.setMetodoPago('contra_entrega');
      expect(component.selectedMetodoPago()).toBe('contra_entrega');
    });
  });

  describe('confirmPayment', () => {
    function createOrderAndSetResult(estadoInicial: Order['estado'] = 'pendiente_pago'): Order {
      const component = fixture.componentInstance;
      const order: Order = {
        id: 'order-1',
        cliente_id: 'cliente-1',
        tipo: 'alquiler',
        estado: estadoInicial,
        fecha_inicio: '2026-09-01',
        fecha_fin: '2026-09-05',
        direccion_entrega: 'Calle Falsa 123',
        zona_id: 'zona-test-uuid',
      };
      component.orderResult.set(order);
      return order;
    }

    it('no hace nada si no hay orden confirmada', () => {
      loadModel();
      const component = fixture.componentInstance;
      component.confirmPayment();

      expect(component.paymentResult()).toBeNull();
      expect(component.paymentLoading()).toBe(false);
      httpMock.expectNone((r) => r.url.includes('/pay'));
    });

    it('confirma el pago exitosamente y actualiza el estado de la orden cuando queda "capturado"', () => {
      loadModel();
      createOrderAndSetResult();
      const component = fixture.componentInstance;

      component.confirmPayment();
      const req = httpMock.expectOne(`${environment.apiUrl}/orders/order-1/pay`);
      expect(req.request.body).toEqual({ metodo: 'pse' });

      req.flush({
        id: 'pay-1',
        order_id: 'order-1',
        tipo: 'pago_alquiler',
        metodo: 'pse',
        estado: 'capturado',
        monto: 125000,
        wompi_transaction_id: 'wompi-tx-1',
      });

      expect(component.paymentResult()?.estado).toBe('capturado');
      expect(component.orderResult()?.estado).toBe('confirmada');
      expect(component.paymentLoading()).toBe(false);
    });

    it('actualiza el estado de la orden cuando el pago queda en "hold"', () => {
      loadModel();
      createOrderAndSetResult();
      const component = fixture.componentInstance;
      component.setMetodoPago('tarjeta');

      component.confirmPayment();
      const req = httpMock.expectOne(`${environment.apiUrl}/orders/order-1/pay`);
      req.flush({
        id: 'pay-1',
        order_id: 'order-1',
        tipo: 'deposito_garantia',
        metodo: 'tarjeta',
        estado: 'hold',
        monto: 20000,
        wompi_transaction_id: 'wompi-tx-2',
      });

      expect(component.orderResult()?.estado).toBe('confirmada');
    });

    it('no modifica el estado de la orden si el pago queda "pendiente"', () => {
      loadModel();
      createOrderAndSetResult();
      const component = fixture.componentInstance;
      component.setMetodoPago('contra_entrega');

      component.confirmPayment();
      const req = httpMock.expectOne(`${environment.apiUrl}/orders/order-1/pay`);
      req.flush({
        id: 'pay-1',
        order_id: 'order-1',
        tipo: 'pago_alquiler',
        metodo: 'contra_entrega',
        estado: 'pendiente',
        monto: 125000,
        wompi_transaction_id: null,
      });

      expect(component.orderResult()?.estado).toBe('pendiente_pago');
    });

    it('setea un error si el pago falla', () => {
      loadModel();
      createOrderAndSetResult();
      const component = fixture.componentInstance;

      component.confirmPayment();
      const req = httpMock.expectOne(`${environment.apiUrl}/orders/order-1/pay`);
      req.flush('error', { status: 500, statusText: 'Server Error' });

      expect(component.paymentError()).toBe('No pudimos procesar el pago. Intenta de nuevo.');
      expect(component.paymentLoading()).toBe(false);
    });
  });
});
