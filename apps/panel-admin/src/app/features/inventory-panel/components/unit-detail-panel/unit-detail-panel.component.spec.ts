import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { UnitDetailPanelComponent } from './unit-detail-panel.component';
import { InventoryService } from '../../../../core/inventory/inventory.service';
import {
  ToolUnit,
  ToolUnitListItem,
  ToolUnitStatusLogEntry,
} from '../../../../core/models/inventory.models';

describe('UnitDetailPanelComponent', () => {
  let fixture: ComponentFixture<UnitDetailPanelComponent>;
  let component: UnitDetailPanelComponent;
  let inventorySpy: jasmine.SpyObj<InventoryService>;

  const mockRow: ToolUnitListItem = {
    id: 'u1',
    modelo_id: 'm1',
    numero_serie: 'SN-001',
    estado: 'Operativo',
    fecha_ingreso: '2026-01-01',
    qr_code_url: 'data:image/png;base64,AAA',
    ubicacion_bodega: 'Estante A3',
    modelo_nombre: 'Taladro Percutor',
    modelo_categoria: 'Eléctrica',
    estado_visualizacion: 'Operativo',
  };

  const mockUnit: ToolUnit = {
    id: 'u1',
    modelo_id: 'm1',
    numero_serie: 'SN-001',
    estado: 'Operativo',
    fecha_ingreso: '2026-01-01',
    qr_code_url: 'data:image/png;base64,AAA',
    fecha_adquisicion: '2026-01-01',
    costo_compra: 500_000,
    ubicacion_bodega: 'Estante A3',
  };

  const mockHistory: ToolUnitStatusLogEntry[] = [
    {
      id: 'log1',
      unidad_id: 'u1',
      estado_anterior: 'Nuevo',
      estado_nuevo: 'Operativo',
      fotos_urls: [],
      autor_id: 'a1',
      created_at: '2026-01-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', ['getUnitById', 'getUnitHistory']);

    TestBed.configureTestingModule({
      imports: [UnitDetailPanelComponent],
      providers: [{ provide: InventoryService, useValue: inventorySpy }],
    });

    fixture = TestBed.createComponent(UnitDetailPanelComponent);
    component = fixture.componentInstance;
  });

  it('muestra el estado vacío cuando no hay unidad seleccionada', () => {
    fixture.detectChanges();

    expect(component.detail()).toBeNull();
    expect(inventorySpy.getUnitById).not.toHaveBeenCalled();
    expect(inventorySpy.getUnitHistory).not.toHaveBeenCalled();
  });

  it('al setear "unit" consulta GET /inventory/units/{id} y GET /inventory/units/{id}/history en paralelo', () => {
    inventorySpy.getUnitById.and.returnValue(of(mockUnit));
    inventorySpy.getUnitHistory.and.returnValue(of(mockHistory));

    component.unit = mockRow;
    component.ngOnChanges({
      unit: {
        previousValue: null,
        currentValue: mockRow,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    expect(inventorySpy.getUnitById).toHaveBeenCalledWith('u1');
    expect(inventorySpy.getUnitHistory).toHaveBeenCalledWith('u1');
    expect(component.detail()).toEqual(mockUnit);
    expect(component.history()).toEqual(mockHistory);
    expect(component.loading()).toBe(false);
  });

  it('vuelve a consultar ambos endpoints cuando cambia la unidad seleccionada', () => {
    inventorySpy.getUnitById.and.returnValue(of(mockUnit));
    inventorySpy.getUnitHistory.and.returnValue(of(mockHistory));

    component.unit = mockRow;
    component.ngOnChanges({
      unit: { previousValue: null, currentValue: mockRow, firstChange: true, isFirstChange: () => true },
    });
    inventorySpy.getUnitById.calls.reset();
    inventorySpy.getUnitHistory.calls.reset();

    const otherRow: ToolUnitListItem = { ...mockRow, id: 'u2' };
    component.unit = otherRow;
    component.ngOnChanges({
      unit: { previousValue: mockRow, currentValue: otherRow, firstChange: false, isFirstChange: () => false },
    });

    expect(inventorySpy.getUnitById).toHaveBeenCalledWith('u2');
    expect(inventorySpy.getUnitHistory).toHaveBeenCalledWith('u2');
  });

  it('limpia el detalle cuando "unit" vuelve a null', () => {
    inventorySpy.getUnitById.and.returnValue(of(mockUnit));
    inventorySpy.getUnitHistory.and.returnValue(of(mockHistory));

    component.unit = mockRow;
    component.ngOnChanges({
      unit: { previousValue: null, currentValue: mockRow, firstChange: true, isFirstChange: () => true },
    });

    component.unit = null;
    component.ngOnChanges({
      unit: { previousValue: mockRow, currentValue: null, firstChange: false, isFirstChange: () => false },
    });

    expect(component.detail()).toBeNull();
    expect(component.history()).toEqual([]);
  });

  it('setea un mensaje de error si falla alguno de los dos endpoints', () => {
    inventorySpy.getUnitById.and.returnValue(throwError(() => new Error('network error')));
    inventorySpy.getUnitHistory.and.returnValue(of(mockHistory));

    component.unit = mockRow;
    component.ngOnChanges({
      unit: { previousValue: null, currentValue: mockRow, firstChange: true, isFirstChange: () => true },
    });

    expect(component.errorMessage()).toBe('No pudimos cargar el detalle completo de esta unidad.');
    expect(component.loading()).toBe(false);
    // El historial sí se pudo cargar — se muestra igual, no se pierde por el error del otro endpoint.
    expect(component.history()).toEqual(mockHistory);
  });

  it('estadoBadgeClass refleja el estado de visualización de la fila seleccionada', () => {
    expect(component.estadoBadgeClass()).toBe('');

    component.unit = mockRow;
    expect(component.estadoBadgeClass()).toBe('badge-operativo');

    component.unit = { ...mockRow, estado_visualizacion: 'Dado de Baja' };
    expect(component.estadoBadgeClass()).toBe('badge-dado-de-baja');
  });
});
