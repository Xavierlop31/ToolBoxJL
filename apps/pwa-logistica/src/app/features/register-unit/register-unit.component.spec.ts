import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { RegisterUnitComponent } from './register-unit.component';
import { InventoryService } from '../../core/inventory/inventory.service';
import { ToolModelOption, ToolUnit } from '../../core/models/inventory.models';

describe('RegisterUnitComponent', () => {
  let fixture: ComponentFixture<RegisterUnitComponent>;
  let component: RegisterUnitComponent;
  let inventorySpy: jasmine.SpyObj<InventoryService>;

  const mockModels: ToolModelOption[] = [
    { id: 'm1', nombre: 'Taladro Percutor', marca: 'Bosch', categoria: 'Eléctrica' },
  ];

  const mockUnit: ToolUnit = {
    id: 'u1',
    modelo_id: 'm1',
    numero_serie: 'TBJL-DEM-0089',
    estado: 'Nuevo',
    fecha_ingreso: '2026-09-01',
    qr_code_url: 'data:image/png;base64,AAA',
  };

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', [
      'listModelOptions',
      'createUnit',
    ]);
    inventorySpy.listModelOptions.and.returnValue(of(mockModels));

    TestBed.configureTestingModule({
      imports: [RegisterUnitComponent],
      providers: [provideRouter([]), { provide: InventoryService, useValue: inventorySpy }],
    });

    fixture = TestBed.createComponent(RegisterUnitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('HU-13.2: carga los modelos del catálogo al iniciar', () => {
    expect(inventorySpy.listModelOptions).toHaveBeenCalled();
    expect(component.models()).toEqual(mockModels);
    expect(component.loadingModels()).toBe(false);
  });

  it('marca el formulario como touched y no llama a la API si es inválido', () => {
    component.submit();

    expect(component.form.get('modelo_id')?.touched).toBe(true);
    expect(inventorySpy.createUnit).not.toHaveBeenCalled();
  });

  it('HU-13.2: registra la unidad y muestra la vista previa imprimible del QR', () => {
    const resultSubject = new Subject<ToolUnit>();
    inventorySpy.createUnit.and.returnValue(resultSubject.asObservable());

    component.form.setValue({
      modelo_id: 'm1',
      numero_serie: 'TBJL-DEM-0089',
      fecha_adquisicion: '2026-09-01',
      costo_compra: 500_000,
      ubicacion_bodega: 'Estante A3',
    });

    component.submit();

    expect(inventorySpy.createUnit).toHaveBeenCalledWith({
      modelo_id: 'm1',
      numero_serie: 'TBJL-DEM-0089',
      fecha_adquisicion: '2026-09-01',
      costo_compra: 500_000,
      ubicacion_bodega: 'Estante A3',
    });
    expect(component.submitting()).toBe(true);

    resultSubject.next(mockUnit);
    resultSubject.complete();

    expect(component.createdUnit()).toEqual(mockUnit);
    expect(component.submitting()).toBe(false);
  });

  it('setea un mensaje de error del backend si el registro falla', () => {
    inventorySpy.createUnit.and.returnValue(
      throwError(() => ({ error: { message: 'Serial duplicado.' } })),
    );

    component.form.setValue({
      modelo_id: 'm1',
      numero_serie: 'TBJL-DEM-0089',
      fecha_adquisicion: '2026-09-01',
      costo_compra: 500_000,
      ubicacion_bodega: 'Estante A3',
    });
    component.submit();

    expect(component.submitError()).toBe('Serial duplicado.');
    expect(component.submitting()).toBe(false);
  });

  it('nombreModelo devuelve el nombre y marca legibles, o el id crudo si no lo encuentra', () => {
    expect(component.nombreModelo('m1')).toBe('Taladro Percutor — Bosch');
    expect(component.nombreModelo('desconocido')).toBe('desconocido');
  });

  it('registrarOtra limpia el resultado y resetea el formulario para un nuevo alta', () => {
    inventorySpy.createUnit.and.returnValue(of(mockUnit));
    component.form.setValue({
      modelo_id: 'm1',
      numero_serie: 'TBJL-DEM-0089',
      fecha_adquisicion: '2026-09-01',
      costo_compra: 500_000,
      ubicacion_bodega: 'Estante A3',
    });
    component.submit();
    expect(component.createdUnit()).toEqual(mockUnit);

    component.registrarOtra();

    expect(component.createdUnit()).toBeNull();
    expect(component.form.get('modelo_id')?.value).toBe('');
  });
});
