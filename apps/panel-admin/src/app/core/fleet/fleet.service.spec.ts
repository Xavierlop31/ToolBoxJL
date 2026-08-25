import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { FleetService } from './fleet.service';
import { Vehicle } from '../models/fleet.models';

describe('FleetService', () => {
  let service: FleetService;
  let httpMock: HttpTestingController;

  const mockVehicle: Vehicle = {
    id: '33333333-3333-4333-8333-333333333333',
    tipo: 'camioneta',
    capacidad_kg: 800,
    capacidad_m3: 6,
    zonas: ['b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FleetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('RF-3.1: registra un vehículo de la flota con tipo, capacidad y zonas', () => {
    service
      .registrarVehiculo({
        tipo: 'camioneta',
        capacidad_kg: 800,
        capacidad_m3: 6,
        zonas: ['b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e'],
      })
      .subscribe((vehicle) => {
        expect(vehicle).toEqual(mockVehicle);
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/fleet/vehicles`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      tipo: 'camioneta',
      capacidad_kg: 800,
      capacidad_m3: 6,
      zonas: ['b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e'],
    });
    req.flush(mockVehicle);
  });
});
