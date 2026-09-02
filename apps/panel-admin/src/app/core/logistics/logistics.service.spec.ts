import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { LogisticsService } from './logistics.service';
import { RoutesToday, Shipment } from '../models/logistics.models';

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

  it('HU-13.4: obtiene las rutas de hoy agrupadas por repartidor', () => {
    const mockRoutesToday: RoutesToday = {
      repartidores: [
        {
          repartidor_id: 'r1',
          nombre: 'Juan Pérez',
          vehiculo_id: 'v1',
          placa: 'ABC123',
          total_paradas: 3,
          paradas_completadas: 1,
          porcentaje_avance: 33.3,
          estado_ruta: 'En Progreso',
          paradas: [
            {
              shipment_id: 's1',
              order_id: 'o1',
              tipo: 'entrega',
              estado_envio: 'entregado',
              direccion: 'Calle 10 # 20-30',
              cliente_nombre: 'Constructora ABC',
              hora_estimada_llegada: '08:00',
              herramientas: [{ modelo_nombre: 'Taladro', numero_serie: 'SN-1' }],
            },
          ],
        },
      ],
    };

    service.getRoutesToday().subscribe((routesToday) => {
      expect(routesToday).toEqual(mockRoutesToday);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/logistics/routes-today`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRoutesToday);
  });
});
