import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    { id: 's1', order_id: 'o1', tipo: 'entrega', estado_envio: 'pendiente_asignacion' },
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

      expect(component.shipments().length).toBe(3);
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

      expect(component.shipments().length).toBe(2);
      const actualizadoEnLista = component.shipments().find((s) => s.id === 's1');
      expect(actualizadoEnLista?.estado_envio).toBe('en_ruta_entrega');
    });

    it('elimina un envío de la lista por DELETE', () => {
      realtimeSubject.next({ eventType: 'DELETE', new: {}, old: { id: 's2' } });

      expect(component.shipments().length).toBe(1);
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
