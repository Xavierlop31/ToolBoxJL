import { TestBed } from '@angular/core/testing';

import { RouteCacheService } from './route-cache.service';
import { MyRouteResponse } from '../models/logistics.models';

describe('RouteCacheService', () => {
  let service: RouteCacheService;

  const mockResponse: MyRouteResponse = {
    route: {
      id: 'route-1',
      vehiculo_id: 'vehiculo-1',
      fecha: '2026-08-25',
      paradas: ['shipment-1'],
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
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RouteCacheService);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('devuelve null si todavía no hay ninguna ruta cacheada', () => {
    expect(service.load()).toBeNull();
  });

  it('guarda la última ruta exitosa y la devuelve tal cual en la siguiente carga', () => {
    service.save(mockResponse);
    expect(service.load()).toEqual(mockResponse);
  });

  it('pisa la ruta cacheada anterior con la más reciente (un único valor)', () => {
    service.save(mockResponse);
    const nuevaRuta: MyRouteResponse = {
      ...mockResponse,
      route: { ...mockResponse.route, fecha: '2026-08-26' },
    };
    service.save(nuevaRuta);
    expect(service.load()).toEqual(nuevaRuta);
  });
});
