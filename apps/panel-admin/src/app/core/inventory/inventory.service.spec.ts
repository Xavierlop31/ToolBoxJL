import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { InventoryService } from './inventory.service';
import {
  CreateToolUnitInput,
  InventoryMetrics,
  ListToolUnitsResult,
  MaintenanceUnit,
  ToolModelOption,
  ToolUnit,
  ToolUnitStatusLogEntry,
} from '../models/inventory.models';

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;

  const mockUnit: ToolUnit = {
    id: 'u1',
    modelo_id: 'm1',
    numero_serie: 'SN-001',
    estado: 'Operativo',
    fecha_ingreso: '2026-01-01',
    qr_code_url: 'data:image/png;base64,AAA',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('HU-13.1: obtiene las tarjetas de KPIs de inventario', () => {
    const mockMetrics: InventoryMetrics = {
      total_unidades: 100,
      operativas: 60,
      en_alquiler: 30,
      en_mantenimiento_o_baja: 10,
    };

    service.getMetrics().subscribe((metrics) => {
      expect(metrics).toEqual(mockMetrics);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/inventory/metrics`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMetrics);
  });

  it('HU-13.1: lista unidades filtrando por q, estado, page y pageSize', () => {
    const mockResult: ListToolUnitsResult = {
      items: [
        {
          ...mockUnit,
          modelo_nombre: 'Taladro Percutor',
          modelo_categoria: 'Eléctrica',
          estado_visualizacion: 'Operativo',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    service
      .listUnits({ q: 'SN-001', estado: 'Operativo', page: 1, pageSize: 20 })
      .subscribe((result) => {
        expect(result).toEqual(mockResult);
      });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/inventory/units?q=SN-001&estado=Operativo&page=1&pageSize=20`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResult);
  });

  it('HU-13.1: lista unidades sin filtros', () => {
    service.listUnits().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/inventory/units`);
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('HU-13.1: obtiene la ficha de una unidad por id (para "Ver QR")', () => {
    service.getUnitById('u1').subscribe((unit) => {
      expect(unit).toEqual(mockUnit);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/inventory/units/u1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUnit);
  });

  it('HU-13.2: registra una unidad física y genera su QR', () => {
    const input: CreateToolUnitInput = {
      modelo_id: 'm1',
      numero_serie: 'SN-002',
      fecha_adquisicion: '2026-01-15',
      costo_compra: 500_000,
      ubicacion_bodega: 'Estante A3',
    };

    service.createUnit(input).subscribe((unit) => {
      expect(unit).toEqual(mockUnit);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/inventory/units`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(mockUnit);
  });

  it('HU-13.3: actualiza el estado de una unidad', () => {
    const mockLogEntry: ToolUnitStatusLogEntry = {
      id: 'log1',
      unidad_id: 'u1',
      estado_anterior: 'Operativo',
      estado_nuevo: 'En Mantenimiento',
      fotos_urls: [],
      autor_id: 'a1',
      created_at: '2026-09-01T10:00:00Z',
      tipo_mantenimiento: 'Correctivo',
      falla_reportada: 'No enciende',
      tecnico_asignado: 'Pedro',
      costo_estimado: 100_000,
      fecha_prevista_fin: '2026-09-10',
    };

    service
      .updateUnitStatus('u1', {
        estado_nuevo: 'En Mantenimiento',
        tipo_mantenimiento: 'Correctivo',
        falla_reportada: 'No enciende',
        tecnico_asignado: 'Pedro',
        costo_estimado: 100_000,
        fecha_prevista_fin: '2026-09-10',
      })
      .subscribe((logEntry) => {
        expect(logEntry).toEqual(mockLogEntry);
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/inventory/units/u1/status`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockLogEntry);
  });

  it('HU-13.3: lista las unidades en mantenimiento/baja', () => {
    const mockMaintenance: MaintenanceUnit[] = [
      {
        ...mockUnit,
        estado: 'En Mantenimiento',
        modelo_nombre: 'Taladro Percutor',
        ultimo_evento_mantenimiento: null,
      },
    ];

    service.listMaintenance().subscribe((units) => {
      expect(units).toEqual(mockMaintenance);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/inventory/maintenance`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMaintenance);
  });

  it('HU-13.2: lista los modelos disponibles para el selector de alta de unidad', () => {
    const mockModels: ToolModelOption[] = [
      { id: 'm1', nombre: 'Taladro Percutor', marca: 'Bosch', categoria: 'Eléctrica' },
    ];

    service.listModelOptions().subscribe((models) => {
      expect(models).toEqual(mockModels);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/catalog/search`);
    expect(req.request.method).toBe('GET');
    req.flush(mockModels);
  });
});
