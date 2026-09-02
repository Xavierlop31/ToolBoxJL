import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import { GeneralTabComponent } from './general-tab.component';
import { InventoryService } from '../../../../core/inventory/inventory.service';
import { ListToolUnitsResult, ToolUnitListItem } from '../../../../core/models/inventory.models';

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

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', [
      'listUnits',
      'listModelOptions',
      'getUnitById',
      'updateUnitStatus',
      'createUnit',
    ]);
    inventorySpy.listUnits.and.returnValue(of(mockResult));

    TestBed.configureTestingModule({
      imports: [GeneralTabComponent],
      providers: [{ provide: InventoryService, useValue: inventorySpy }],
    });

    fixture = TestBed.createComponent(GeneralTabComponent);
    component = fixture.componentInstance;
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

  it('HU-13.2: abre y cierra el modal de registro, y refresca la tabla al registrar', () => {
    fixture.detectChanges();
    inventorySpy.listUnits.calls.reset();

    component.openRegisterModal();
    expect(component.showRegisterModal()).toBe(true);

    component.onUnitRegistered();
    expect(component.showRegisterModal()).toBe(false);
    expect(inventorySpy.listUnits).toHaveBeenCalled();
  });

  it('HU-13.1: abre el modal de "Ver QR" con el id de la unidad', () => {
    fixture.detectChanges();

    component.verQr(mockUnit);

    expect(component.detailModal()).toEqual({ unitId: 'u1', mode: 'qr' });
  });

  it('HU-13.1: abre el modal de "Historial" con el id de la unidad', () => {
    fixture.detectChanges();

    component.verHistorial(mockUnit);

    expect(component.detailModal()).toEqual({ unitId: 'u1', mode: 'historial' });
  });

  it('HU-13.3: abre el modal de "Cambiar Estado" con la unidad seleccionada y refresca al actualizar', () => {
    fixture.detectChanges();
    inventorySpy.listUnits.calls.reset();

    component.cambiarEstado(mockUnit);
    expect(component.statusChangeUnit()).toEqual(mockUnit);

    component.onStatusUpdated();
    expect(component.statusChangeUnit()).toBeNull();
    expect(inventorySpy.listUnits).toHaveBeenCalled();
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
