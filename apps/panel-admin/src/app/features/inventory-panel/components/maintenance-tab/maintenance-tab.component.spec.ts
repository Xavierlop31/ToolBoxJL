import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { MaintenanceTabComponent } from './maintenance-tab.component';
import { InventoryService } from '../../../../core/inventory/inventory.service';
import { MaintenanceUnit } from '../../../../core/models/inventory.models';

describe('MaintenanceTabComponent', () => {
  let fixture: ComponentFixture<MaintenanceTabComponent>;
  let component: MaintenanceTabComponent;
  let inventorySpy: jasmine.SpyObj<InventoryService>;

  const mockUnitEnMantenimiento: MaintenanceUnit = {
    id: 'u1',
    modelo_id: 'm1',
    numero_serie: 'SN-001',
    estado: 'En Mantenimiento',
    fecha_ingreso: '2026-01-01',
    qr_code_url: 'data:image/png;base64,AAA',
    modelo_nombre: 'Taladro Percutor',
    ultimo_evento_mantenimiento: {
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
    },
  };

  const mockUnitDadaDeBaja: MaintenanceUnit = {
    ...mockUnitEnMantenimiento,
    id: 'u2',
    estado: 'Dado de Baja',
    ultimo_evento_mantenimiento: {
      ...mockUnitEnMantenimiento.ultimo_evento_mantenimiento!,
      estado_nuevo: 'Dado de Baja',
      motivo_baja: 'Daño irreparable',
    },
  };

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', ['listMaintenance']);
    inventorySpy.listMaintenance.and.returnValue(
      of([mockUnitEnMantenimiento, mockUnitDadaDeBaja]),
    );

    TestBed.configureTestingModule({
      imports: [MaintenanceTabComponent],
      providers: [{ provide: InventoryService, useValue: inventorySpy }],
    });

    fixture = TestBed.createComponent(MaintenanceTabComponent);
    component = fixture.componentInstance;
  });

  it('HU-13.3: carga las unidades en mantenimiento y dadas de baja', () => {
    fixture.detectChanges();

    expect(inventorySpy.listMaintenance).toHaveBeenCalled();
    expect(component.units()).toEqual([mockUnitEnMantenimiento, mockUnitDadaDeBaja]);
  });

  it('setea un mensaje de error si falla la carga', () => {
    inventorySpy.listMaintenance.and.returnValue(throwError(() => new Error('network error')));

    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No pudimos cargar las unidades en mantenimiento.');
  });

  it('HU-13.3: "Reintegrar a Servicio" abre el modal con presetEstado Operativo', () => {
    fixture.detectChanges();

    component.reintegrar(mockUnitEnMantenimiento);

    expect(component.statusChangeTarget()).toEqual({
      unit: mockUnitEnMantenimiento,
      presetEstado: 'Operativo',
    });
  });

  it('HU-13.3: "Declarar Baja Definitiva" abre el modal con presetEstado Dado de Baja', () => {
    fixture.detectChanges();

    component.declararBaja(mockUnitEnMantenimiento);

    expect(component.statusChangeTarget()).toEqual({
      unit: mockUnitEnMantenimiento,
      presetEstado: 'Dado de Baja',
    });
  });

  it('HU-13.3: recarga la lista y cierra el modal al actualizar el estado', () => {
    fixture.detectChanges();
    inventorySpy.listMaintenance.calls.reset();

    component.reintegrar(mockUnitEnMantenimiento);
    component.onStatusUpdated();

    expect(component.statusChangeTarget()).toBeNull();
    expect(inventorySpy.listMaintenance).toHaveBeenCalled();
  });
});
