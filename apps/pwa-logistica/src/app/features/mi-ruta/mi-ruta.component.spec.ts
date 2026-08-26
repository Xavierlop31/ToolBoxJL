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
      },
      {
        shipment_id: 'shipment-2',
        order_id: 'order-2',
        tipo: 'recogida',
        estado_envio: 'en_ruta_recogida',
        direccion: 'Calle 2 #2-22',
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
});
