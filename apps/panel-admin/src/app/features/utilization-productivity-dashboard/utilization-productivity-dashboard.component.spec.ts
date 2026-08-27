import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';

import { UtilizationProductivityDashboardComponent } from './utilization-productivity-dashboard.component';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import {
  DeliveryProductivity,
  UtilizationSummary,
} from '../../core/models/analytics.models';

describe('UtilizationProductivityDashboardComponent', () => {
  let fixture: ComponentFixture<UtilizationProductivityDashboardComponent>;
  let component: UtilizationProductivityDashboardComponent;
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;

  const mockUtilization: UtilizationSummary = {
    utilizacion_global_pct: 62.5,
    por_modelo: [{ modelo_id: 'm1', utilizacion_pct: 80 }],
  };

  const mockProductivity: DeliveryProductivity[] = [
    { repartidor_id: 'r1', entregas_exitosas: 18, ruta_asignada: 20, tiempo_promedio_min: 12.4 },
    { repartidor_id: 'r2', entregas_exitosas: 0, ruta_asignada: 0, tiempo_promedio_min: 0 },
  ];

  beforeEach(() => {
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', [
      'getUtilization',
      'getDeliveryProductivity',
    ]);
    analyticsSpy.getUtilization.and.returnValue(
      new Subject<UtilizationSummary>().asObservable(),
    );
    analyticsSpy.getDeliveryProductivity.and.returnValue(
      new Subject<DeliveryProductivity[]>().asObservable(),
    );

    TestBed.configureTestingModule({
      imports: [UtilizationProductivityDashboardComponent],
      providers: [provideRouter([]), { provide: AnalyticsService, useValue: analyticsSpy }],
    });

    fixture = TestBed.createComponent(UtilizationProductivityDashboardComponent);
    component = fixture.componentInstance;
  });

  it('HU-7.3: carga en paralelo la utilización y la productividad al inicializar', () => {
    const utilizationSubject = new Subject<UtilizationSummary>();
    const productivitySubject = new Subject<DeliveryProductivity[]>();
    analyticsSpy.getUtilization.and.returnValue(utilizationSubject.asObservable());
    analyticsSpy.getDeliveryProductivity.and.returnValue(productivitySubject.asObservable());

    fixture.detectChanges();
    utilizationSubject.next(mockUtilization);
    productivitySubject.next(mockProductivity);
    utilizationSubject.complete();
    productivitySubject.complete();

    expect(component.utilization()).toEqual(mockUtilization);
    expect(component.productivity()).toEqual(mockProductivity);
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('setea un error y limpia los resultados si alguna de las dos llamadas falla', () => {
    analyticsSpy.getUtilization.and.returnValue(throwError(() => new Error('boom')));
    analyticsSpy.getDeliveryProductivity.and.returnValue(
      new Subject<DeliveryProductivity[]>().asObservable(),
    );

    fixture.detectChanges();

    expect(component.utilization()).toBeNull();
    expect(component.productivity()).toEqual([]);
    expect(component.errorMessage()).toBe(
      'No pudimos cargar la utilización de inventario y la productividad de repartidores.',
    );
    expect(component.loading()).toBe(false);
  });

  it('formatPct agrega el símbolo % con un decimal', () => {
    fixture.detectChanges();
    expect(component.formatPct(62.5)).toBe('62,5%');
  });

  it('formatMin agrega el sufijo "min"', () => {
    fixture.detectChanges();
    expect(component.formatMin(12.4)).toBe('12,4 min');
  });

  it('productividadPct calcula el porcentaje de entregas exitosas sobre ruta asignada', () => {
    fixture.detectChanges();
    expect(component.productividadPct(mockProductivity[0])).toBe('90%');
  });

  it('productividadPct devuelve "N/D" si no hubo ruta asignada (evita división por cero)', () => {
    fixture.detectChanges();
    expect(component.productividadPct(mockProductivity[1])).toBe('N/D');
  });

  it('permite refrescar ambos indicadores manualmente', () => {
    const utilizationSubject = new Subject<UtilizationSummary>();
    const productivitySubject = new Subject<DeliveryProductivity[]>();
    analyticsSpy.getUtilization.and.returnValue(utilizationSubject.asObservable());
    analyticsSpy.getDeliveryProductivity.and.returnValue(productivitySubject.asObservable());
    fixture.detectChanges();
    utilizationSubject.next(mockUtilization);
    productivitySubject.next(mockProductivity);
    utilizationSubject.complete();
    productivitySubject.complete();

    analyticsSpy.getUtilization.calls.reset();
    analyticsSpy.getDeliveryProductivity.calls.reset();

    component.consultar();

    expect(analyticsSpy.getUtilization).toHaveBeenCalled();
    expect(analyticsSpy.getDeliveryProductivity).toHaveBeenCalled();
  });
});
