import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, throwError } from 'rxjs';

import { ShipmentsPanelComponent } from './shipments-panel.component';
import { LogisticsService } from '../../core/logistics/logistics.service';
import { LogisticsRealtimeService } from '../../core/logistics/logistics-realtime.service';
import { Shipment } from '../../core/models/logistics.models';

describe('ShipmentsPanelComponent', () => {
  let fixture: ComponentFixture<ShipmentsPanelComponent>;
  let component: ShipmentsPanelComponent;
  let logisticsSpy: jasmine.SpyObj<LogisticsService>;
  let realtimeSpy: jasmine.SpyObj<LogisticsRealtimeService>;
  let realtimeSubject: Subject<{
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }>;

  const mockShipments: Shipment[] = [
    {
      id: 's1',
      order_id: 'o1',
      tipo: 'entrega',
      estado_envio: 'pendiente_asignacion',
      numero_orden: 'TJL0000001',
      cliente_nombre: 'Ana Gómez',
      direccion_entrega: 'Calle 10 # 20-30, Medellín',
    },
    { id: 's2', order_id: 'o2', tipo: 'recogida', estado_envio: 'en_ruta_recogida' },
  ];

  function setup(): void {
    realtimeSubject = new Subject();
    logisticsSpy = jasmine.createSpyObj('LogisticsService', ['getShipments']);
    realtimeSpy = jasmine.createSpyObj('LogisticsRealtimeService', ['watchShipments']);
    realtimeSpy.watchShipments.and.returnValue(realtimeSubject.asObservable() as never);

    TestBed.configureTestingModule({
      imports: [ShipmentsPanelComponent],
      providers: [
        { provide: LogisticsService, useValue: logisticsSpy },
        { provide: LogisticsRealtimeService, useValue: realtimeSpy },
      ],
    });

    fixture = TestBed.createComponent(ShipmentsPanelComponent);
    component = fixture.componentInstance;
  }

  it('RF-3.3: carga el listado inicial y se suscribe a Realtime', () => {
    setup();
    const shipmentsSubject = new Subject<Shipment[]>();
    logisticsSpy.getShipments.and.returnValue(shipmentsSubject.asObservable());

    fixture.detectChanges();
    shipmentsSubject.next(mockShipments);
    shipmentsSubject.complete();

    expect(component.shipments()).toEqual(mockShipments);
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
    expect(realtimeSpy.watchShipments).toHaveBeenCalled();
  });

  it('setea un error si falla la carga inicial de envíos', () => {
    setup();
    logisticsSpy.getShipments.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No pudimos cargar el panel de envíos.');
    expect(component.loading()).toBe(false);
  });

  it('BUG CORREGIDO: renderiza numero_orden/cliente_nombre/direccion_entrega en vez del GUID crudo del pedido', () => {
    setup();
    const shipmentsSubject = new Subject<Shipment[]>();
    logisticsSpy.getShipments.and.returnValue(shipmentsSubject.asObservable());

    fixture.detectChanges();
    shipmentsSubject.next(mockShipments);
    shipmentsSubject.complete();
    fixture.detectChanges();

    const filas = fixture.debugElement.queryAll(By.css('[data-testid="shipment-row"]'));
    expect(filas[0].nativeElement.textContent).toContain('TJL0000001');
    expect(filas[0].nativeElement.textContent).toContain('Ana Gómez');
    expect(filas[0].nativeElement.textContent).toContain('Calle 10 # 20-30, Medellín');
    expect(filas[0].nativeElement.textContent).not.toContain('o1');

    // Sin numero_orden/cliente_nombre/direccion_entrega (segundo shipment
    // del fixture), cae al order_id crudo como último recurso.
    expect(filas[1].nativeElement.textContent).toContain('o2');
  });

  describe('actualizaciones en tiempo real', () => {
    beforeEach(() => {
      setup();
      const shipmentsSubject = new Subject<Shipment[]>();
      logisticsSpy.getShipments.and.returnValue(shipmentsSubject.asObservable());
      fixture.detectChanges();
      shipmentsSubject.next(mockShipments);
      shipmentsSubject.complete();
    });

    it('RF-3.3: agrega un nuevo envío recibido por INSERT', () => {
      const nuevoEnvio: Shipment = {
        id: 's3',
        order_id: 'o3',
        tipo: 'entrega',
        estado_envio: 'pendiente_asignacion',
      };

      realtimeSubject.next({
        eventType: 'INSERT',
        new: nuevoEnvio as unknown as Record<string, unknown>,
        old: {},
      });

      expect(component.shipments()).toHaveSize(3);
      expect(component.shipments()).toContain(nuevoEnvio);
    });

    it('RF-3.3: actualiza el estado de un envío existente por UPDATE, sin recargar la página', () => {
      const actualizado: Shipment = {
        id: 's1',
        order_id: 'o1',
        tipo: 'entrega',
        estado_envio: 'en_ruta_entrega',
      };

      realtimeSubject.next({
        eventType: 'UPDATE',
        new: actualizado as unknown as Record<string, unknown>,
        old: { id: 's1' },
      });

      expect(component.shipments()).toHaveSize(2);
      const actualizadoEnLista = component.shipments().find((s) => s.id === 's1');
      expect(actualizadoEnLista?.estado_envio).toBe('en_ruta_entrega');
    });

    it('BUG CORREGIDO: un UPDATE por Realtime no borra numero_orden/cliente_nombre/direccion_entrega (esos campos no viven en la tabla shipments, el payload crudo nunca los trae)', () => {
      // Simula el payload real de postgres_changes: solo columnas de
      // `shipments` (sin los campos enriquecidos que solo vinieron del GET inicial).
      const filaCruda = {
        id: 's1',
        order_id: 'o1',
        tipo: 'entrega',
        estado_envio: 'en_ruta_entrega',
      };

      realtimeSubject.next({
        eventType: 'UPDATE',
        new: filaCruda as unknown as Record<string, unknown>,
        old: { id: 's1' },
      });

      const actualizadoEnLista = component.shipments().find((s) => s.id === 's1');
      expect(actualizadoEnLista?.estado_envio).toBe('en_ruta_entrega');
      expect(actualizadoEnLista?.numero_orden).toBe('TJL0000001');
      expect(actualizadoEnLista?.cliente_nombre).toBe('Ana Gómez');
      expect(actualizadoEnLista?.direccion_entrega).toBe('Calle 10 # 20-30, Medellín');
    });

    it('elimina un envío de la lista por DELETE', () => {
      realtimeSubject.next({ eventType: 'DELETE', new: {}, old: { id: 's2' } });

      expect(component.shipments()).toHaveSize(1);
      expect(component.shipments().find((s) => s.id === 's2')).toBeUndefined();
    });

    it('no interrumpe el panel si el canal Realtime falla', () => {
      realtimeSubject.error(new Error('canal no disponible'));

      // El listado inicial sigue siendo válido, y no se pisa con un mensaje de error.
      expect(component.shipments()).toEqual(mockShipments);
      expect(component.errorMessage()).toBeNull();
    });
  });
});
