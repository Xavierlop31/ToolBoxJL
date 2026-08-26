import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { MyRouteService } from './my-route.service';
import { MyRouteResponse } from '../models/logistics.models';

describe('MyRouteService', () => {
  let service: MyRouteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MyRouteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('HU-8.2: consume GET /logistics/my-route y devuelve la respuesta tal cual', () => {
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
          direccion: 'Calle 1',
        },
        {
          shipment_id: 'shipment-2',
          order_id: 'order-2',
          tipo: 'recogida',
          estado_envio: 'en_ruta_recogida',
          direccion: 'Calle 2',
        },
      ],
    };

    service.getMyRoute().subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/logistics/my-route`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('HU-8.2: propaga el 404 sin transformarlo (no hay ruta publicada hoy)', () => {
    service.getMyRoute().subscribe({
      next: () => fail('no debería resolver en un 404'),
      error: (err) => expect(err.status).toBe(404),
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/logistics/my-route`);
    req.flush(
      { message: 'No hay ruta publicada para hoy' },
      { status: 404, statusText: 'Not Found' },
    );
  });
});
