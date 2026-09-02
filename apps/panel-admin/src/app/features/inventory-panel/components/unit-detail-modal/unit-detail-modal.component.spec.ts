import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { UnitDetailModalComponent } from './unit-detail-modal.component';
import { InventoryService } from '../../../../core/inventory/inventory.service';
import { ToolUnit, ToolUnitStatusLogEntry } from '../../../../core/models/inventory.models';

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

  const mockHistory: ToolUnitStatusLogEntry[] = [
    {
      id: 'log2',
      unidad_id: 'u1',
      estado_anterior: 'En Mantenimiento',
      estado_nuevo: 'Operativo',
      fotos_urls: [],
      autor_id: 'a1',
      created_at: '2026-09-02T09:00:00Z',
    },
    {
      id: 'log1',
      unidad_id: 'u1',
      estado_anterior: 'Nuevo',
      estado_nuevo: 'En Mantenimiento',
      fotos_urls: [],
      autor_id: 'a1',
      created_at: '2026-09-01T10:00:00Z',
      tipo_mantenimiento: 'Correctivo',
      falla_reportada: 'No enciende',
      tecnico_asignado: 'Pedro',
      costo_estimado: 100_000,
      fecha_prevista_fin: '2026-09-10',
    },
  ];

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', ['getUnitById', 'getUnitHistory']);

    TestBed.configureTestingModule({
      imports: [UnitDetailModalComponent],
      providers: [{ provide: InventoryService, useValue: inventorySpy }],
    });

    fixture = TestBed.createComponent(UnitDetailModalComponent);
    component = fixture.componentInstance;
    component.unitId = 'u1';
  });

  it('HU-13.1: modo "qr" consulta GET /inventory/units/{id} para obtener el qr_code_url puntual', () => {
    inventorySpy.getUnitById.and.returnValue(of(mockUnit));
    component.mode = 'qr';

    fixture.detectChanges();

    expect(inventorySpy.getUnitById).toHaveBeenCalledWith('u1');
    expect(inventorySpy.getUnitHistory).not.toHaveBeenCalled();
    expect(component.unit()).toEqual(mockUnit);
    expect(component.loading()).toBe(false);
  });

  it('HU-13.1: modo "historial" consulta GET /inventory/units/{id}/history y muestra la hoja de vida completa', () => {
    inventorySpy.getUnitHistory.and.returnValue(of(mockHistory));
    component.mode = 'historial';

    fixture.detectChanges();

    expect(inventorySpy.getUnitHistory).toHaveBeenCalledWith('u1');
    expect(inventorySpy.getUnitById).not.toHaveBeenCalled();
    expect(component.history()).toEqual(mockHistory);
    expect(component.loading()).toBe(false);
  });

  it('setea un mensaje de error si falla la carga en modo "qr"', () => {
    inventorySpy.getUnitById.and.returnValue(throwError(() => new Error('network error')));
    component.mode = 'qr';

    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No pudimos cargar la información de esta unidad.');
    expect(component.loading()).toBe(false);
  });

  it('setea un mensaje de error si falla la carga en modo "historial"', () => {
    inventorySpy.getUnitHistory.and.returnValue(throwError(() => new Error('network error')));
    component.mode = 'historial';

    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No pudimos cargar el historial de esta unidad.');
    expect(component.loading()).toBe(false);
  });

  it('emite closed al cerrar', () => {
    inventorySpy.getUnitById.and.returnValue(of(mockUnit));
    component.mode = 'qr';
    fixture.detectChanges();
    const closedSpy = jasmine.createSpy('closed');
    component.closed.subscribe(closedSpy);

    component.close();

    expect(closedSpy).toHaveBeenCalled();
  });
});
