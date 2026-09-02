import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { InventoryPanelComponent } from './inventory-panel.component';
import { InventoryService } from '../../core/inventory/inventory.service';
import { LogisticsService } from '../../core/logistics/logistics.service';
import { InventoryMetrics } from '../../core/models/inventory.models';

describe('InventoryPanelComponent', () => {
  let fixture: ComponentFixture<InventoryPanelComponent>;
  let component: InventoryPanelComponent;
  let inventorySpy: jasmine.SpyObj<InventoryService>;
  let logisticsSpy: jasmine.SpyObj<LogisticsService>;

  const mockMetrics: InventoryMetrics = {
    total_unidades: 120,
    operativas: 80,
    en_alquiler: 30,
    en_mantenimiento_o_baja: 10,
  };

  beforeEach(() => {
    inventorySpy = jasmine.createSpyObj('InventoryService', [
      'getMetrics',
      'listUnits',
      'listModelOptions',
      'listMaintenance',
    ]);
    inventorySpy.getMetrics.and.returnValue(of(mockMetrics));
    inventorySpy.listUnits.and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 20 }));
    inventorySpy.listModelOptions.and.returnValue(of([]));
    inventorySpy.listMaintenance.and.returnValue(of([]));

    logisticsSpy = jasmine.createSpyObj('LogisticsService', ['getRoutesToday', 'getShipments']);
    logisticsSpy.getRoutesToday.and.returnValue(of({ repartidores: [] }));

    TestBed.configureTestingModule({
      imports: [InventoryPanelComponent],
      providers: [
        { provide: InventoryService, useValue: inventorySpy },
        { provide: LogisticsService, useValue: logisticsSpy },
      ],
    });

    fixture = TestBed.createComponent(InventoryPanelComponent);
    component = fixture.componentInstance;
  });

  it('HU-13.1: carga las 4 tarjetas de KPIs al iniciar', () => {
    fixture.detectChanges();

    expect(inventorySpy.getMetrics).toHaveBeenCalled();
    expect(component.metrics()).toEqual(mockMetrics);
    expect(component.loadingMetrics()).toBe(false);
  });

  it('no rompe la carga de la pantalla si las métricas fallan', () => {
    inventorySpy.getMetrics.and.returnValue(throwError(() => new Error('network error')));

    fixture.detectChanges();

    expect(component.metrics()).toBeNull();
    expect(component.loadingMetrics()).toBe(false);
  });

  it('empieza en la pestaña "Inventario General" y permite alternar entre las 3 pestañas', () => {
    fixture.detectChanges();

    expect(component.activeTab()).toBe('general');

    component.setTab('mantenimiento');
    expect(component.activeTab()).toBe('mantenimiento');

    component.setTab('rutas');
    expect(component.activeTab()).toBe('rutas');
  });

  it('recarga las métricas cuando una pestaña notifica un cambio de datos', () => {
    fixture.detectChanges();
    inventorySpy.getMetrics.calls.reset();

    component.loadMetrics();

    expect(inventorySpy.getMetrics).toHaveBeenCalled();
  });
});
