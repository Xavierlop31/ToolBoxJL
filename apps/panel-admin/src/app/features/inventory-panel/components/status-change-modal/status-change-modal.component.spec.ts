import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { StatusChangeModalComponent } from './status-change-modal.component';
import { InventoryService } from '../../../../core/inventory/inventory.service';
import { ToolUnit, ToolUnitStatusLogEntry } from '../../../../core/models/inventory.models';

describe('StatusChangeModalComponent', () => {
  let fixture: ComponentFixture<StatusChangeModalComponent>;
  let component: StatusChangeModalComponent;
  let inventorySpy: jasmine.SpyObj<InventoryService>;

  const mockUnit: ToolUnit = {
    id: 'u1',
    modelo_id: 'm1',
    numero_serie: 'SN-001',
    estado: 'Operativo',
    fecha_ingreso: '2026-01-01',
    qr_code_url: 'data:image/png;base64,AAA',
  };

  const mockLogEntry: ToolUnitStatusLogEntry = {
    id: 'log1',
    unidad_id: 'u1',
    estado_anterior: 'Operativo',
    estado_nuevo: 'En Mantenimiento',
    fotos_urls: [],
    autor_id: 'a1',
    created_at: '2026-09-01T10:00:00Z',
  };

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', ['updateUnitStatus']);

    TestBed.configureTestingModule({
      imports: [StatusChangeModalComponent],
      providers: [{ provide: InventoryService, useValue: inventorySpy }],
    });

    fixture = TestBed.createComponent(StatusChangeModalComponent);
    component = fixture.componentInstance;
    component.unit = mockUnit;
  });

  it('HU-13.3: parte del estado actual de la unidad cuando no hay estado preseleccionado', () => {
    fixture.detectChanges();
    expect(component.form.controls.estado_nuevo.value).toBe('Operativo');
    expect(component.lockEstado).toBe(false);
  });

  it('HU-13.3: bloquea el selector cuando viene un estado preseleccionado (Reintegrar/Baja)', () => {
    component.presetEstado = 'Dado de Baja';
    fixture.detectChanges();

    expect(component.form.controls.estado_nuevo.value).toBe('Dado de Baja');
    expect(component.lockEstado).toBe(true);
  });

  it('HU-13.3: exige los campos de taller si el nuevo estado es "En Mantenimiento"', () => {
    fixture.detectChanges();
    component.form.patchValue({ estado_nuevo: 'En Mantenimiento' });

    component.submit();

    expect(component.validationError()).toBe(
      'Completa Tipo, Falla reportada, Técnico asignado, Costo estimado y Fecha prevista de fin.',
    );
    expect(inventorySpy.updateUnitStatus).not.toHaveBeenCalled();
  });

  it('HU-13.3: asigna una unidad a mantenimiento con los campos de taller completos', () => {
    inventorySpy.updateUnitStatus.and.returnValue(of(mockLogEntry));
    fixture.detectChanges();

    component.form.setValue({
      estado_nuevo: 'En Mantenimiento',
      tipo_mantenimiento: 'Correctivo',
      falla_reportada: 'No enciende',
      tecnico_asignado: 'Pedro',
      costo_estimado: 100_000,
      fecha_prevista_fin: '2026-09-10',
      motivo_baja: '',
    });

    component.submit();

    expect(inventorySpy.updateUnitStatus).toHaveBeenCalledWith('u1', {
      estado_nuevo: 'En Mantenimiento',
      tipo_mantenimiento: 'Correctivo',
      falla_reportada: 'No enciende',
      tecnico_asignado: 'Pedro',
      costo_estimado: 100_000,
      fecha_prevista_fin: '2026-09-10',
    });
  });

  it('HU-13.3: exige motivo_baja si el nuevo estado es "Dado de Baja"', () => {
    fixture.detectChanges();
    component.form.patchValue({ estado_nuevo: 'Dado de Baja' });

    component.submit();

    expect(component.validationError()).toBe('Indica el motivo de la baja.');
    expect(inventorySpy.updateUnitStatus).not.toHaveBeenCalled();
  });

  it('HU-13.3: declara la baja definitiva con motivo', () => {
    inventorySpy.updateUnitStatus.and.returnValue(
      of({ ...mockLogEntry, estado_nuevo: 'Dado de Baja', motivo_baja: 'Daño irreparable' }),
    );
    component.presetEstado = 'Dado de Baja';
    fixture.detectChanges();

    component.form.patchValue({ motivo_baja: 'Daño irreparable' });
    component.submit();

    expect(inventorySpy.updateUnitStatus).toHaveBeenCalledWith('u1', {
      estado_nuevo: 'Dado de Baja',
      motivo_baja: 'Daño irreparable',
    });
  });

  it('HU-13.3: no exige campos extra para un cambio de estado simple (ej. a Operativo)', () => {
    inventorySpy.updateUnitStatus.and.returnValue(
      of({ ...mockLogEntry, estado_nuevo: 'Operativo' }),
    );
    component.presetEstado = 'Operativo';
    fixture.detectChanges();

    component.submit();

    expect(inventorySpy.updateUnitStatus).toHaveBeenCalledWith('u1', {
      estado_nuevo: 'Operativo',
    });
  });

  it('emite updated con la entrada de hoja de vida creada', () => {
    inventorySpy.updateUnitStatus.and.returnValue(of(mockLogEntry));
    const updatedSpy = jasmine.createSpy('updated');
    component.updated.subscribe(updatedSpy);
    fixture.detectChanges();

    component.form.patchValue({ estado_nuevo: 'Excelente' });
    component.submit();

    expect(updatedSpy).toHaveBeenCalledWith(mockLogEntry);
  });

  it('setea un mensaje de error del backend si la actualización falla', () => {
    inventorySpy.updateUnitStatus.and.returnValue(
      throwError(() => ({ error: { message: 'Estado inválido.' } })),
    );
    fixture.detectChanges();

    component.form.patchValue({ estado_nuevo: 'Excelente' });
    component.submit();

    expect(component.submitError()).toBe('Estado inválido.');
    expect(component.submitting()).toBe(false);
  });

  it('emite closed al cerrar', () => {
    fixture.detectChanges();
    const closedSpy = jasmine.createSpy('closed');
    component.closed.subscribe(closedSpy);

    component.close();

    expect(closedSpy).toHaveBeenCalled();
  });
});
