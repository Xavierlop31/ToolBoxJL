import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { UnitListComponent } from './unit-list.component';
import { InventoryService } from '../../core/inventory/inventory.service';
import {
  ListToolUnitsResult,
  ToolUnitListItem,
} from '../../core/models/inventory.models';

describe('UnitListComponent', () => {
  let fixture: ComponentFixture<UnitListComponent>;
  let component: UnitListComponent;
  let inventorySpy: jasmine.SpyObj<InventoryService>;

  const mockItem: ToolUnitListItem = {
    id: 'u1',
    modelo_id: 'm1',
    numero_serie: 'SN-0001',
    estado: 'Operativo',
    modelo_nombre: 'Taladro Percutor',
    modelo_categoria: 'Eléctrica',
    estado_visualizacion: 'Operativo',
  };

  const mockResult: ListToolUnitsResult = {
    items: [mockItem],
    total: 1,
    page: 1,
    pageSize: 20,
  };

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', ['listUnits']);
    inventorySpy.listUnits.and.returnValue(of(mockResult));

    TestBed.configureTestingModule({
      imports: [UnitListComponent],
      providers: [provideRouter([]), { provide: InventoryService, useValue: inventorySpy }],
    });

    fixture = TestBed.createComponent(UnitListComponent);
    component = fixture.componentInstance;
  });

  it('HU-13.1: carga la lista de unidades al iniciar, sin filtro de estado ni KPIs', () => {
    fixture.detectChanges();

    expect(inventorySpy.listUnits).toHaveBeenCalledWith({
      q: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(component.items()).toEqual([mockItem]);
    expect(component.total()).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('HU-13.1: busca por texto con debounce y reinicia a la página 1', fakeAsync(() => {
    fixture.detectChanges();
    inventorySpy.listUnits.calls.reset();

    component.searchControl.setValue('taladro');
    tick(300);

    expect(inventorySpy.listUnits).toHaveBeenCalledWith({
      q: 'taladro',
      page: 1,
      pageSize: 20,
    });
  }));

  it('muestra un mensaje de error si la carga falla', () => {
    inventorySpy.listUnits.and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No pudimos cargar el inventario de unidades.');
    expect(component.loading()).toBe(false);
  });

  it('goToPage no navega fuera de rango pero sí dentro de rango', () => {
    inventorySpy.listUnits.and.returnValue(
      of({ items: [mockItem], total: 45, page: 1, pageSize: 20 }),
    );
    fixture.detectChanges();
    inventorySpy.listUnits.calls.reset();

    component.goToPage(0);
    component.goToPage(999);
    expect(inventorySpy.listUnits).not.toHaveBeenCalled();

    component.goToPage(2);
    expect(component.page()).toBe(2);
    expect(inventorySpy.listUnits).toHaveBeenCalledWith({
      q: undefined,
      page: 2,
      pageSize: 20,
    });
  });
});
