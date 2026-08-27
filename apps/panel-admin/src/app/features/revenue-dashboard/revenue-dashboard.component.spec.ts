import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';

import { RevenueDashboardComponent } from './revenue-dashboard.component';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { RevenueBreakdown } from '../../core/models/analytics.models';

describe('RevenueDashboardComponent', () => {
  let fixture: ComponentFixture<RevenueDashboardComponent>;
  let component: RevenueDashboardComponent;
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;

  const mockRevenue: RevenueBreakdown = {
    ventas_directas: 1000000,
    tarifas_alquiler: 2500000,
    cobros_mora: 50000,
    total: 3550000,
  };

  beforeEach(() => {
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', ['getRevenue']);
    analyticsSpy.getRevenue.and.returnValue(new Subject<RevenueBreakdown>().asObservable());

    TestBed.configureTestingModule({
      imports: [RevenueDashboardComponent],
      providers: [provideRouter([]), { provide: AnalyticsService, useValue: analyticsSpy }],
    });

    fixture = TestBed.createComponent(RevenueDashboardComponent);
    component = fixture.componentInstance;
  });

  it('HU-7.1: consulta automáticamente el periodo actual al inicializar', () => {
    fixture.detectChanges();

    const now = new Date();
    const mesEsperado = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(component.periodoControl.value).toBe(mesEsperado);
    expect(analyticsSpy.getRevenue).toHaveBeenCalledWith(mesEsperado);
  });

  it('HU-7.1: muestra el desglose de ingresos totales para el periodo consultado', () => {
    const subject = new Subject<RevenueBreakdown>();
    analyticsSpy.getRevenue.and.returnValue(subject.asObservable());

    fixture.detectChanges();
    subject.next(mockRevenue);
    subject.complete();

    expect(component.revenue()).toEqual(mockRevenue);
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('permite consultar un periodo distinto', () => {
    const subject = new Subject<RevenueBreakdown>();
    analyticsSpy.getRevenue.and.returnValue(subject.asObservable());
    fixture.detectChanges();
    subject.next(mockRevenue);
    subject.complete();

    component.periodoControl.setValue('2026-01');
    component.consultar();

    expect(analyticsSpy.getRevenue).toHaveBeenCalledWith('2026-01');
  });

  it('no consulta si el periodo está vacío', () => {
    fixture.detectChanges();
    analyticsSpy.getRevenue.calls.reset();

    component.periodoControl.setValue('');
    component.consultar();

    expect(analyticsSpy.getRevenue).not.toHaveBeenCalled();
  });

  it('setea un error y limpia el resultado si la consulta falla', () => {
    analyticsSpy.getRevenue.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    expect(component.revenue()).toBeNull();
    expect(component.errorMessage()).toBe('No pudimos cargar los ingresos de este periodo.');
    expect(component.loading()).toBe(false);
  });

  it('formatCop formatea el valor como pesos colombianos', () => {
    fixture.detectChanges();
    const formatted = component.formatCop(1000000);
    // Intl.NumberFormat es-CO agrega separadores de miles con punto y símbolo $
    expect(formatted).toContain('1.000.000');
    expect(formatted).toContain('$');
  });
});
