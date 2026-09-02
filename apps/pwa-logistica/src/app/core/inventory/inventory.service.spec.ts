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

  it('HU-13.2: registra el alta de una unidad física + QR', () => {
    const input = {
      modelo_id: mockUnit.modelo_id,
      numero_serie: 'SN-0002',
      fecha_adquisicion: '2026-01-15',
      costo_compra: 500000,
      ubicacion_bodega: 'Estante A3',
    };

    service.createUnit(input).subscribe((unit) => {
      expect(unit.numero_serie).toBe('SN-0002');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/inventory/units`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({
      ...mockUnit,
      numero_serie: 'SN-0002',
      qr_code_url: 'data:image/png;base64,abc123',
    });
  });

  it('HU-13.1: lista unidades con búsqueda por texto y paginación', () => {
    service.listUnits({ q: 'taladro', page: 2, pageSize: 20 }).subscribe((result) => {
      expect(result.total).toBe(1);
      expect(result.items[0].modelo_nombre).toBe('Taladro Percutor');
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/inventory/units`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('taladro');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('20');
    req.flush({
      items: [
        {
          ...mockUnit,
          modelo_nombre: 'Taladro Percutor',
          modelo_categoria: 'Eléctrica',
          estado_visualizacion: 'Operativo',
        },
      ],
      total: 1,
      page: 2,
      pageSize: 20,
    });
  });

  it('HU-13.2: lista modelos del catálogo para el selector de alta de unidad', () => {
    service.listModelOptions().subscribe((models) => {
      expect(models.length).toBe(1);
      expect(models[0].nombre).toBe('Taladro Percutor');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/catalog/search`);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: mockUnit.modelo_id,
        nombre: 'Taladro Percutor',
        marca: 'Bosch',
        categoria: 'Eléctrica',
      },
    ]);
  });
});
