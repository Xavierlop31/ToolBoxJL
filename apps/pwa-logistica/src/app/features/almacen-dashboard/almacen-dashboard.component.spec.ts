import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { throwError, of } from 'rxjs';

import { AlmacenDashboardComponent } from './almacen-dashboard.component';
import { InventoryService } from '../../core/inventory/inventory.service';
import {
  AuditFeedEntry,
  InventoryMetrics,
  ListToolUnitsResult,
  ToolUnitListItem,
  WarehouseOccupancy,
} from '../../core/models/inventory.models';

describe('AlmacenDashboardComponent', () => {
  let fixture: ComponentFixture<AlmacenDashboardComponent>;
  let component: AlmacenDashboardComponent;
  let inventorySpy: jasmine.SpyObj<InventoryService>;

  const mockUnit: ToolUnitListItem = {
    id: 'u1',
    modelo_id: 'm1',
    numero_serie: 'SN-001',
    estado: 'Operativo',
    modelo_nombre: 'Taladro Percutor',
    modelo_categoria: 'Eléctrica',
    estado_visualizacion: 'Operativo',
  };

  const mockResult: ListToolUnitsResult = { items: [mockUnit], total: 1, page: 1, pageSize: 20 };

  const mockMetrics: InventoryMetrics = {
    total_unidades: 120,
    operativas: 80,
    en_alquiler: 30,
    en_mantenimiento_o_baja: 10,
  };

  const mockOccupancy: WarehouseOccupancy[] = [{ ubicacion: 'Estante A', cantidad: 5 }];

  const mockAuditFeed: AuditFeedEntry[] = [
    {
      id: 'log1',
      unidad_id: 'u1',
      numero_serie: 'SN-001',
      modelo_nombre: 'Taladro Percutor',
      estado_anterior: 'Nuevo',
      estado_nuevo: 'Operativo',
      created_at: '2026-09-14T10:00:00Z',
      autor_id: 'a1',
      falla_reportada: null,
      motivo_baja: null,
    },
  ];

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', [
      'listUnits',
      'getMetrics',
      'getOccupancy',
      'getAuditFeed',
    ]);
    inventorySpy.listUnits.and.returnValue(of(mockResult));
    inventorySpy.getMetrics.and.returnValue(of(mockMetrics));
    inventorySpy.getOccupancy.and.returnValue(of(mockOccupancy));
    inventorySpy.getAuditFeed.and.returnValue(of(mockAuditFeed));

    TestBed.configureTestingModule({
      imports: [AlmacenDashboardComponent],
      providers: [
        { provide: InventoryService, useValue: inventorySpy },
        // RouterLink (botones "Registrar Unidad"/"Hoja de Vida"/"Cambiar
        // Estado") inyecta ActivatedRoute internamente.
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
      ],
    });

    fixture = TestBed.createComponent(AlmacenDashboardComponent);
    component = fixture.componentInstance;
  });

  it('carga las 4 tarjetas de KPIs al iniciar', () => {
    fixture.detectChanges();

    expect(inventorySpy.getMetrics).toHaveBeenCalled();
    expect(component.metrics()).toEqual(mockMetrics);
    expect(component.loadingMetrics()).toBe(false);
  });

  it('carga la ocupación de almacén al iniciar', () => {
    fixture.detectChanges();

    expect(inventorySpy.getOccupancy).toHaveBeenCalled();
    expect(component.occupancy()).toEqual(mockOccupancy);
    expect(component.loadingOccupancy()).toBe(false);
  });

  it('carga el feed de auditoría al iniciar', () => {
    fixture.detectChanges();

    expect(inventorySpy.getAuditFeed).toHaveBeenCalled();
    expect(component.auditFeed()).toEqual(mockAuditFeed);
    expect(component.loadingAuditFeed()).toBe(false);
  });

  it('carga la lista de unidades al iniciar sin filtros', () => {
    fixture.detectChanges();

    expect(inventorySpy.listUnits).toHaveBeenCalledWith({
      q: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(component.items()).toEqual([mockUnit]);
    expect(component.total()).toBe(1);
  });

  it('filtra con debounce al escribir en el buscador', fakeAsync(() => {
    fixture.detectChanges();
    inventorySpy.listUnits.calls.reset();

    component.searchControl.setValue('SN-001');
    tick(299);
    expect(inventorySpy.listUnits).not.toHaveBeenCalled();

    tick(1);
    expect(inventorySpy.listUnits).toHaveBeenCalledWith({
      q: 'SN-001',
      page: 1,
      pageSize: 20,
    });
  }));

  it('pagina hacia adelante y hacia atrás dentro del rango válido', () => {
    inventorySpy.listUnits.and.returnValue(of({ items: [], total: 45, page: 1, pageSize: 20 }));
    fixture.detectChanges();

    expect(component.totalPages).toBe(3);

    component.goToPage(2);
    expect(component.page()).toBe(2);

    component.goToPage(0);
    expect(component.page()).toBe(2);

    component.goToPage(10);
    expect(component.page()).toBe(2);
  });

  it('si falla la carga de unidades, setea un mensaje de error', () => {
    inventorySpy.listUnits.and.returnValue(throwError(() => 'boom'));
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No pudimos cargar el inventario de unidades.');
    expect(component.loading()).toBe(false);
  });

  it('estadoBadgeClass devuelve la clase CSS correcta por estado', () => {
    expect(component.estadoBadgeClass('Operativo')).toBe('badge-operativo');
    expect(component.estadoBadgeClass('En Alquiler')).toBe('badge-en-alquiler');
    expect(component.estadoBadgeClass('En Mantenimiento')).toBe('badge-en-mantenimiento');
    expect(component.estadoBadgeClass('Dado de Baja')).toBe('badge-dado-de-baja');
  });
});
