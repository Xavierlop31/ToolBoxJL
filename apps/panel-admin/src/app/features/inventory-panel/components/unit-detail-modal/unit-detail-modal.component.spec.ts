import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { UnitDetailModalComponent } from './unit-detail-modal.component';
import { InventoryService } from '../../../../core/inventory/inventory.service';
import { ToolUnit } from '../../../../core/models/inventory.models';

describe('UnitDetailModalComponent', () => {
  let fixture: ComponentFixture<UnitDetailModalComponent>;
  let component: UnitDetailModalComponent;
  let inventorySpy: jasmine.SpyObj<InventoryService>;

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

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', ['getUnitById']);

    TestBed.configureTestingModule({
      imports: [UnitDetailModalComponent],
      providers: [{ provide: InventoryService, useValue: inventorySpy }],
    });

    fixture = TestBed.createComponent(UnitDetailModalComponent);
    component = fixture.componentInstance;
    component.unitId = 'u1';
  });

  it('HU-13.1: consulta GET /inventory/units/{id} para obtener el qr_code_url puntual', () => {
    inventorySpy.getUnitById.and.returnValue(of(mockUnit));
    component.mode = 'qr';

    fixture.detectChanges();

    expect(inventorySpy.getUnitById).toHaveBeenCalledWith('u1');
    expect(component.unit()).toEqual(mockUnit);
    expect(component.loading()).toBe(false);
  });

  it('HU-13.1: en modo historial, muestra el estado y datos actuales de la unidad', () => {
    inventorySpy.getUnitById.and.returnValue(of(mockUnit));
    component.mode = 'historial';

    fixture.detectChanges();

    expect(component.unit()).toEqual(mockUnit);
  });

  it('setea un mensaje de error si falla la carga', () => {
    inventorySpy.getUnitById.and.returnValue(throwError(() => new Error('network error')));

    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No pudimos cargar la información de esta unidad.');
    expect(component.loading()).toBe(false);
  });

  it('emite closed al cerrar', () => {
    inventorySpy.getUnitById.and.returnValue(of(mockUnit));
    fixture.detectChanges();
    const closedSpy = jasmine.createSpy('closed');
    component.closed.subscribe(closedSpy);

    component.close();

    expect(closedSpy).toHaveBeenCalled();
  });
});
