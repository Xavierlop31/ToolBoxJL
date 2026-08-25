import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { LogisticsService } from './logistics.service';
import { Shipment } from '../models/logistics.models';

describe('LogisticsService', () => {
  let service: LogisticsService;
  let httpMock: HttpTestingController;

  const mockShipments: Shipment[] = [
    { id: 's1', order_id: 'o1', tipo: 'entrega', estado_envio: 'pendiente_asignacion' },
    { id: 's2', order_id: 'o2', tipo: 'recogida', estado_envio: 'en_ruta_recogida' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LogisticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('RF-3.3: obtiene el listado inicial de envíos en curso', () => {
    service.getShipments().subscribe((shipments) => {
      expect(shipments).toEqual(mockShipments);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/logistics/shipments`);
    expect(req.request.method).toBe('GET');
    req.flush(mockShipments);
  });
});
