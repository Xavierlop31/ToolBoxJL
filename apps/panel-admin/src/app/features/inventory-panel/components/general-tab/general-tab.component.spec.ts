import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import { GeneralTabComponent } from './general-tab.component';
import { InventoryService } from '../../../../core/inventory/inventory.service';
import {
  AuditFeedEntry,
  InventoryMetrics,
  ListToolUnitsResult,
  ToolUnitListItem,
  WarehouseOccupancy,
} from '../../../../core/models/inventory.models';

describe('GeneralTabComponent', () => {
  let fixture: ComponentFixture<GeneralTabComponent>;
  let component: GeneralTabComponent;
  let inventorySpy: jasmine.SpyObj<InventoryService>;

  const mockUnit: ToolUnitListItem = {
    id: 'u1',
    modelo_id: 'm1',
    numero_serie: 'SN-001',
    estado: 'Operativo',
    fecha_ingreso: '2026-01-01',
    qr_code_url: 'data:image/png;base64,AAA',
    modelo_nombre: 'Taladro Percutor',
    modelo_categoria: 'Eléctrica',
    estado_visualizacion: 'Operativo',
  };

  const mockResult: ListToolUnitsResult = {
    items: [mockUnit],
    total: 1,
    page: 1,
    pageSize: 20,
  };

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
      created_at: '2026-09-11T10:00:00Z',
      autor_id: 'a1',
      falla_reportada: null,
      motivo_baja: null,
    },
  ];

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', [
      'listUnits',
      'listModelOptions',
      'getMetrics',
      'getUnitById',
      'getUnitHistory',
      'updateUnitStatus',
      'createUnit',
      'getOccupancy',
      'getAuditFeed',
    ]);
    inventorySpy.listUnits.and.returnValue(of(mockResult));
    inventorySpy.getMetrics.and.returnValue(of(mockMetrics));
    inventorySpy.getOccupancy.and.returnValue(of(mockOccupancy));
    inventorySpy.getAuditFeed.and.returnValue(of(mockAuditFeed));

    TestBed.configureTestingModule({
      imports: [GeneralTabComponent],
      providers: [{ provide: InventoryService, useValue: inventorySpy }],
    });

    fixture = TestBed.createComponent(GeneralTabComponent);
    component = fixture.componentInstance;
  });

  it('Issue #184-bis: carga la ocupación de almacén al iniciar', () => {
    fixture.detectChanges();

    expect(inventorySpy.getOccupancy).toHaveBeenCalled();
    expect(component.occupancy()).toEqual(mockOccupancy);
    expect(component.loadingOccupancy()).toBe(false);
  });

  it('Issue #184-bis: carga el feed de auditoría al iniciar', () => {
    fixture.detectChanges();

    expect(inventorySpy.getAuditFeed).toHaveBeenCalled();
    expect(component.auditFeed()).toEqual(mockAuditFeed);
    expect(component.loadingAuditFeed()).toBe(false);
  });

  it('HU-13.1: carga las 4 tarjetas de KPIs al iniciar', () => {
    fixture.detectChanges();

    expect(inventorySpy.getMetrics).toHaveBeenCalled();
    expect(component.metrics()).toEqual(mockMetrics);
    expect(component.loadingMetrics()).toBe(false);
  });

  it('HU-13.1: carga la tabla al iniciar sin filtros', () => {
    fixture.detectChanges();

    expect(inventorySpy.listUnits).toHaveBeenCalledWith({
      q: undefined,
      estado: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(component.items()).toEqual([mockUnit]);
    expect(component.total()).toBe(1);
  });

  it('HU-13.1: filtra con debounce al escribir en el buscador', fakeAsync(() => {
    fixture.detectChanges();
    inventorySpy.listUnits.calls.reset();

    component.searchControl.setValue('SN-001');
    tick(299);
    expect(inventorySpy.listUnits).not.toHaveBeenCalled();

    tick(1);
    expect(inventorySpy.listUnits).toHaveBeenCalledWith({
      q: 'SN-001',
      estado: undefined,
      page: 1,
      pageSize: 20,
    });
  }));

  it('HU-13.1: filtra por estado inmediatamente al seleccionar', () => {
    fixture.detectChanges();
    inventorySpy.listUnits.calls.reset();

    component.estadoControl.setValue('En Mantenimiento');

    expect(inventorySpy.listUnits).toHaveBeenCalledWith({
      q: undefined,
      estado: 'En Mantenimiento',
      page: 1,
      pageSize: 20,
    });
  });

  it('HU-13.2: abre el modal de registro y lo cierra explícitamente vía (closed)', () => {
    fixture.detectChanges();

    component.openRegisterModal();
    expect(component.showRegisterModal()).toBe(true);

    component.showRegisterModal.set(false);
    expect(component.showRegisterModal()).toBe(false);
  });

  it(
    'HU-13.2: NO cierra el modal al registrar la unidad — sigue montado mostrando la ' +
      'vista previa imprimible del QR hasta que el usuario lo cierra explícitamente, y refresca tabla + KPIs',
    () => {
      fixture.detectChanges();
      inventorySpy.listUnits.calls.reset();
      inventorySpy.getMetrics.calls.reset();
      inventorySpy.getOccupancy.calls.reset();

      component.openRegisterModal();
      component.onUnitRegistered();

      expect(component.showRegisterModal()).toBe(true);
      expect(inventorySpy.listUnits).toHaveBeenCalled();
      expect(inventorySpy.getMetrics).toHaveBeenCalled();
      // Una unidad nueva puede traer ubicacion_bodega — refresca el widget
      // de ocupación (Issue #184-bis).
      expect(inventorySpy.getOccupancy).toHaveBeenCalled();
    },
  );

  it('Issue #184: seleccionar una fila actualiza el panel docked de detalle', () => {
    fixture.detectChanges();

    expect(component.selectedUnit()).toBeNull();

    component.selectUnit(mockUnit);

    expect(component.selectedUnit()).toEqual(mockUnit);
  });

  it('HU-13.3: abre el modal de "Cambiar Estado" con la unidad seleccionada y refresca la tabla + KPIs al actualizar', () => {
    fixture.detectChanges();
    inventorySpy.listUnits.calls.reset();
    inventorySpy.getMetrics.calls.reset();
    inventorySpy.getAuditFeed.calls.reset();

    component.cambiarEstado(mockUnit);
    expect(component.statusChangeUnit()).toEqual(mockUnit);

    component.onStatusUpdated();
    expect(component.statusChangeUnit()).toBeNull();
    expect(inventorySpy.listUnits).toHaveBeenCalled();
    expect(inventorySpy.getMetrics).toHaveBeenCalled();
    // Un cambio de estado genera una entrada nueva en la hoja de vida —
    // refresca el widget de auditoría (Issue #184-bis).
    expect(inventorySpy.getAuditFeed).toHaveBeenCalled();
  });

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

  it('estadoBadgeClass devuelve la clase CSS correcta por estado', () => {
    expect(component.estadoBadgeClass('Operativo')).toBe('badge-operativo');
    expect(component.estadoBadgeClass('En Alquiler')).toBe('badge-en-alquiler');
    expect(component.estadoBadgeClass('En Mantenimiento')).toBe('badge-en-mantenimiento');
    expect(component.estadoBadgeClass('Dado de Baja')).toBe('badge-dado-de-baja');
  });
});
