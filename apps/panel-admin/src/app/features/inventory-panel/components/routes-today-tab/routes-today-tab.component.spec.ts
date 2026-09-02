import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { RoutesTodayTabComponent } from './routes-today-tab.component';
import { LogisticsService } from '../../../../core/logistics/logistics.service';
import { RoutesToday } from '../../../../core/models/logistics.models';

describe('RoutesTodayTabComponent', () => {
  let fixture: ComponentFixture<RoutesTodayTabComponent>;
  let component: RoutesTodayTabComponent;
  let logisticsSpy: jasmine.SpyObj<LogisticsService>;

  const mockRoutesToday: RoutesToday = {
    repartidores: [
      {
        repartidor_id: 'r1',
        nombre: 'Juan Pérez',
        vehiculo_id: 'v1',
        placa: 'ABC123',
        total_paradas: 2,
        paradas_completadas: 1,
        porcentaje_avance: 50,
        estado_ruta: 'En Progreso',
        paradas: [
          {
            shipment_id: 's1',
            order_id: 'o1',
            tipo: 'entrega',
            estado_envio: 'entregado',
            direccion: 'Calle 10 # 20-30',
            cliente_nombre: 'Constructora ABC',
            hora_estimada_llegada: '08:00',
            herramientas: [{ modelo_nombre: 'Taladro', numero_serie: 'SN-1' }],
          },
          {
            shipment_id: 's2',
            order_id: 'o2',
            tipo: 'recogida',
            estado_envio: 'en_ruta_recogida',
            direccion: 'Calle 15 # 5-10',
            cliente_nombre: 'Constructora XYZ',
            hora_estimada_llegada: '08:45',
            herramientas: [{ modelo_nombre: 'Andamio', numero_serie: 'SN-2' }],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    logisticsSpy = jasmine.createSpyObj('LogisticsService', ['getRoutesToday']);
    logisticsSpy.getRoutesToday.and.returnValue(of(mockRoutesToday));

    TestBed.configureTestingModule({
      imports: [RoutesTodayTabComponent],
      providers: [{ provide: LogisticsService, useValue: logisticsSpy }],
    });

    fixture = TestBed.createComponent(RoutesTodayTabComponent);
    component = fixture.componentInstance;
  });

  it('HU-13.4: carga las rutas de hoy agrupadas por repartidor', () => {
    fixture.detectChanges();

    expect(logisticsSpy.getRoutesToday).toHaveBeenCalled();
    expect(component.repartidores()).toEqual(mockRoutesToday.repartidores);
  });

  it('setea un mensaje de error si falla la carga', () => {
    logisticsSpy.getRoutesToday.and.returnValue(throwError(() => new Error('network error')));

    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No pudimos cargar las rutas de hoy.');
  });

  it('HU-13.4: expande y colapsa el itinerario de un repartidor al hacer click', () => {
    fixture.detectChanges();

    component.toggleRepartidor('r1');
    expect(component.expandedRepartidorId()).toBe('r1');

    component.toggleRepartidor('r1');
    expect(component.expandedRepartidorId()).toBeNull();
  });

  it('HU-13.4: distingue "Entrega" vs "Recolección" en la etiqueta de parada', () => {
    expect(component.tipoParadaLabel('entrega')).toBe('Entrega');
    expect(component.tipoParadaLabel('recogida')).toBe('Recolección');
  });

  it('estadoRutaBadgeClass devuelve la clase CSS correcta por estado de ruta', () => {
    expect(component.estadoRutaBadgeClass('Pendiente')).toBe('badge-pendiente');
    expect(component.estadoRutaBadgeClass('En Progreso')).toBe('badge-en-progreso');
    expect(component.estadoRutaBadgeClass('Completada')).toBe('badge-completada');
  });
});
