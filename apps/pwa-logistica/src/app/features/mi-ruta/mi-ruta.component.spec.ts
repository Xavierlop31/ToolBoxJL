import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { MiRutaComponent } from './mi-ruta.component';
import { RouteCacheService } from '../../core/logistics/route-cache.service';
import { environment } from '../../../environments/environment';
import { MyRouteResponse } from '../../core/models/logistics.models';

describe('MiRutaComponent', () => {
  let fixture: ComponentFixture<MiRutaComponent>;
  let httpMock: HttpTestingController;

  const mockResponse: MyRouteResponse = {
    route: {
      id: 'route-1',
      vehiculo_id: 'vehiculo-1',
      fecha: '2026-08-25',
      paradas: ['shipment-1', 'shipment-2'],
      generada_por: 'agente_1',
    },
    paradas: [
      {
        shipment_id: 'shipment-1',
        order_id: 'order-1',
        tipo: 'entrega',
        estado_envio: 'en_ruta_entrega',
        direccion: 'Calle 1 #1-11',
        pago_pendiente_confirmacion: true,
      },
      {
        shipment_id: 'shipment-2',
        order_id: 'order-2',
        tipo: 'recogida',
        estado_envio: 'en_ruta_recogida',
        direccion: 'Calle 2 #2-22',
        pago_pendiente_confirmacion: false,
      },
    ],
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MiRutaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MiRutaComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('HU-8.2: muestra las paradas en el mismo orden que devuelve el backend', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/logistics/my-route`);
    req.flush(mockResponse);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.data()?.paradas.map((p) => p.shipment_id)).toEqual([
      'shipment-1',
      'shipment-2',
    ]);
    expect(component.loading()).toBe(false);
  });

  it('HU-8.2: cachea la ruta cargada exitosamente', () => {
    const cache = TestBed.inject(RouteCacheService);
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/logistics/my-route`);
    req.flush(mockResponse);
    fixture.detectChanges();

    expect(cache.load()).toEqual(mockResponse);
  });

  it('404: muestra el estado vacío ("no tenés ruta asignada"), no un error genérico', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/logistics/my-route`);
    req.flush(
      { message: 'sin ruta' },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.emptyState()).toBe(true);
    expect(component.errorMessage()).toBeNull();
    expect(component.data()).toBeNull();
  });

  it('offline: si falla la red pero hay una ruta cacheada, la muestra con aviso', () => {
    const cache = TestBed.inject(RouteCacheService);
    cache.save(mockResponse);

    fixture.detectChanges();
    const req = httpMock.expectOne(`${environment.apiUrl}/logistics/my-route`);
    req.error(new ProgressEvent('network error'));
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.data()).toEqual(mockResponse);
    expect(component.offlineFallback()).toBe(true);
    expect(component.emptyState()).toBe(false);
  });

  it('offline sin cache previo: muestra un mensaje de error, no pantalla en blanco', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${environment.apiUrl}/logistics/my-route`);
    req.error(new ProgressEvent('network error'));
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.errorMessage()).toBe('No pudimos cargar tu ruta del día.');
    expect(component.data()).toBeNull();
  });

  describe('Confirmar Cobro (bug de Ingresos en cero, contra entrega)', () => {
    beforeEach(() => {
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/logistics/my-route`).flush(mockResponse);
      fixture.detectChanges();
    });

    it('solo la parada con pago_pendiente_confirmacion=true necesita el botón', () => {
      const component = fixture.componentInstance;
      expect(component.necesitaConfirmarCobro(mockResponse.paradas[0])).toBe(true);
      expect(component.necesitaConfirmarCobro(mockResponse.paradas[1])).toBe(false);
    });

    it('confirmarCobro llama a POST /orders/{id}/confirm-cod-payment y oculta el botón al resolver', () => {
      const component = fixture.componentInstance;

      component.confirmarCobro('order-1');
      expect(component.estaConfirmandoCobro('order-1')).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/orders/order-1/confirm-cod-payment`);
      expect(req.request.method).toBe('POST');
      req.flush({});

      expect(component.estaConfirmandoCobro('order-1')).toBe(false);
      expect(component.necesitaConfirmarCobro(mockResponse.paradas[0])).toBe(false);
    });

    it('si falla la confirmación, muestra un mensaje de error y deja el botón disponible de nuevo', () => {
      const component = fixture.componentInstance;

      component.confirmarCobro('order-1');
      const req = httpMock.expectOne(`${environment.apiUrl}/orders/order-1/confirm-cod-payment`);
      req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(component.estaConfirmandoCobro('order-1')).toBe(false);
      expect(component.confirmError()).toBe('No pudimos confirmar el cobro. Intentá de nuevo.');
      expect(component.necesitaConfirmarCobro(mockResponse.paradas[0])).toBe(true);
    });
  });
});
