import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { CatalogService } from './catalog.service';
import { ToolModel } from '../models/catalog.models';

describe('CatalogService', () => {
  let service: CatalogService;
  let httpMock: HttpTestingController;

  const mockModel: ToolModel = {
    id: '11111111-1111-4111-8111-111111111111',
    nombre: 'Taladro percutor 20V',
    marca: 'DeWalt',
    categoria: 'Taladros',
    tarifa_dia: 25000,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('busca en /catalog/search con los query params provistos', () => {
    service.search({ q: 'taladro' }).subscribe((models) => {
      expect(models).toEqual([mockModel]);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/catalog/search`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('taladro');
    req.flush([mockModel]);
  });

  it('obtiene la ficha de un modelo por id', () => {
    service.getModelById(mockModel.id).subscribe((model) => {
      expect(model).toEqual(mockModel);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/catalog/models/${mockModel.id}`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockModel);
  });

  it('RF-1.4: consulta disponibilidad real por rango de fechas', () => {
    service
      .checkAvailability(mockModel.id, '2026-09-01', '2026-09-05')
      .subscribe((result) => {
        expect(result.unidades_disponibles).toBe(3);
      });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/inventory/check-availability`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('modelo_id')).toBe(mockModel.id);
    expect(req.request.params.get('fecha_inicio')).toBe('2026-09-01');
    expect(req.request.params.get('fecha_fin')).toBe('2026-09-05');
    req.flush({ modelo_id: mockModel.id, unidades_disponibles: 3 });
  });
});
