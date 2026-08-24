import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { InventoryService } from './inventory.service';
import { ToolUnit } from '../models/inventory.models';

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;

  const mockUnit: ToolUnit = {
    id: '22222222-2222-4222-8222-222222222222',
    modelo_id: '11111111-1111-4111-8111-111111111111',
    numero_serie: 'SN-0001',
    estado: 'Operativo',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('RF-1.2: obtiene la ficha de una unidad al escanear su QR', () => {
    service.getUnitById(mockUnit.id).subscribe((unit) => {
      expect(unit).toEqual(mockUnit);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/inventory/units/${mockUnit.id}`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockUnit);
  });

  it('RF-1.3: registra un cambio de estado con fotos opcionales', () => {
    service
      .updateUnitStatus(mockUnit.id, {
        estado_nuevo: 'En Mantenimiento',
        fotos_urls: ['blob:foto1'],
      })
      .subscribe((entry) => {
        expect(entry.estado_nuevo).toBe('En Mantenimiento');
      });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/inventory/units/${mockUnit.id}/status`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      estado_nuevo: 'En Mantenimiento',
      fotos_urls: ['blob:foto1'],
    });
    req.flush({
      id: 'log-1',
      unidad_id: mockUnit.id,
      estado_anterior: 'Operativo',
      estado_nuevo: 'En Mantenimiento',
      fotos_urls: ['blob:foto1'],
      autor_id: 'autor-1',
      created_at: new Date().toISOString(),
    });
  });
});
