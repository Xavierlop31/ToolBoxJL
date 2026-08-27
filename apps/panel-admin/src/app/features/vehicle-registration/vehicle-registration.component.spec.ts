import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';

import { VehicleRegistrationComponent } from './vehicle-registration.component';
import { FleetService } from '../../core/fleet/fleet.service';
import { Vehicle } from '../../core/models/fleet.models';

describe('VehicleRegistrationComponent', () => {
  let fixture: ComponentFixture<VehicleRegistrationComponent>;
  let component: VehicleRegistrationComponent;
  let fleetSpy: jasmine.SpyObj<FleetService>;

  const zonaNorte = 'b8c8d8e8-f8a8-4b8c-8d8e-8f8a8b8c8d8e';

  beforeEach(() => {
    fleetSpy = jasmine.createSpyObj('FleetService', ['registrarVehiculo']);

    TestBed.configureTestingModule({
      imports: [VehicleRegistrationComponent],
      providers: [{ provide: FleetService, useValue: fleetSpy }],
    });

    fixture = TestBed.createComponent(VehicleRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillValidForm(): void {
    component.form.setValue({
      tipo: 'camioneta',
      capacidad_kg: 500,
      capacidad_m3: 3,
      zonas: { [zonaNorte]: true, ...zonasFalse(zonaNorte) },
    });
  }

  function zonasFalse(excepto: string): Record<string, boolean> {
    return Object.fromEntries(
      component.zonas.filter((z) => z.id !== excepto).map((z) => [z.id, false]),
    );
  }

  it('marca el formulario como touched y no llama a la API si es inválido', () => {
    component.submit();

    expect(component.form.get('capacidad_kg')?.touched).toBe(true);
    expect(fleetSpy.registrarVehiculo).not.toHaveBeenCalled();
  });

  it('RF-3.1: setea un error si el formulario es válido pero no se seleccionó ninguna zona', () => {
    component.form.setValue({
      tipo: 'moto',
      capacidad_kg: 50,
      capacidad_m3: 0.5,
      zonas: Object.fromEntries(component.zonas.map((z) => [z.id, false])),
    });

    component.submit();

    expect(component.submitError()).toBe('Selecciona al menos una zona geográfica.');
    expect(fleetSpy.registrarVehiculo).not.toHaveBeenCalled();
  });

  it('RF-3.1: registra el vehículo exitosamente y resetea el formulario', () => {
    const nuevoVehiculo: Vehicle = {
      id: 'v1',
      tipo: 'camioneta',
      capacidad_kg: 500,
      capacidad_m3: 3,
      zonas: [zonaNorte],
    };
    const resultSubject = new Subject<Vehicle>();
    fleetSpy.registrarVehiculo.and.returnValue(resultSubject.asObservable());

    fillValidForm();
    component.submit();

    expect(fleetSpy.registrarVehiculo).toHaveBeenCalledWith({
      tipo: 'camioneta',
      capacidad_kg: 500,
      capacidad_m3: 3,
      zonas: [zonaNorte],
    });
    expect(component.submitting()).toBe(true);

    resultSubject.next(nuevoVehiculo);
    resultSubject.complete();

    expect(component.vehicle()).toEqual(nuevoVehiculo);
    expect(component.submitting()).toBe(false);
    expect(component.form.get('tipo')?.value).toBe('moto');
    expect(component.form.get('capacidad_kg')?.value).toBe(0);
  });

  it('setea un mensaje de error del backend si el registro falla', () => {
    fleetSpy.registrarVehiculo.and.returnValue(
      throwError(() => ({ error: { message: 'Zona inválida.' } })),
    );

    fillValidForm();
    component.submit();

    expect(component.submitError()).toBe('Zona inválida.');
    expect(component.submitting()).toBe(false);
  });

  it('usa un mensaje de error genérico si el backend no provee uno', () => {
    fleetSpy.registrarVehiculo.and.returnValue(throwError(() => new Error('network error')));

    fillValidForm();
    component.submit();

    expect(component.submitError()).toBe('No pudimos registrar el vehículo. Intenta de nuevo.');
  });

  it('nombreZona devuelve el nombre legible de una zona conocida y el id crudo si no la encuentra', () => {
    expect(component.nombreZona(zonaNorte)).toBe('Zona Norte (Bogotá)');
    expect(component.nombreZona('zona-desconocida')).toBe('zona-desconocida');
  });

  it('no reenvía si ya hay un envío en curso (submitting)', () => {
    const resultSubject = new Subject<Vehicle>();
    fleetSpy.registrarVehiculo.and.returnValue(resultSubject.asObservable());

    fillValidForm();
    component.submit();
    expect(fleetSpy.registrarVehiculo).toHaveBeenCalledTimes(1);

    component.submit();
    expect(fleetSpy.registrarVehiculo).toHaveBeenCalledTimes(1);
  });
});
