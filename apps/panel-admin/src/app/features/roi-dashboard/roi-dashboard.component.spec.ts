import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, throwError } from 'rxjs';

import { RoiDashboardComponent } from './roi-dashboard.component';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { RoiItem } from '../../core/models/analytics.models';

describe('RoiDashboardComponent', () => {
  let fixture: ComponentFixture<RoiDashboardComponent>;
  let component: RoiDashboardComponent;
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;

  const mockRoi: RoiItem[] = [
    { modelo_id: 'm1', roi_pct: 145.7 },
    { modelo_id: 'm2', roi_pct: -12.3 },
  ];

  beforeEach(() => {
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', ['getRoi']);
    analyticsSpy.getRoi.and.returnValue(new Subject<RoiItem[]>().asObservable());

    TestBed.configureTestingModule({
      imports: [RoiDashboardComponent],
      providers: [provideRouter([]), { provide: AnalyticsService, useValue: analyticsSpy }],
    });

    fixture = TestBed.createComponent(RoiDashboardComponent);
    component = fixture.componentInstance;
  });

  it('HU-7.2: consulta el ROI de todos los modelos al inicializar (sin modelo_id)', () => {
    fixture.detectChanges();
    expect(analyticsSpy.getRoi).toHaveBeenCalledWith(undefined);
  });

  it('HU-7.2: muestra el ROI de los modelos consultados', () => {
    const subject = new Subject<RoiItem[]>();
    analyticsSpy.getRoi.and.returnValue(subject.asObservable());

    fixture.detectChanges();
    subject.next(mockRoi);
    subject.complete();

    expect(component.roi()).toEqual(mockRoi);
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('HU-7.2: filtra el ROI a un modelo específico cuando se completa el campo', () => {
    fixture.detectChanges();
    analyticsSpy.getRoi.calls.reset();

    component.modeloIdControl.setValue('  m1  ');
    component.consultar();

    expect(analyticsSpy.getRoi).toHaveBeenCalledWith('m1');
  });

  it('setea un error y limpia el resultado si la consulta falla', () => {
    analyticsSpy.getRoi.and.returnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();

    expect(component.roi()).toEqual([]);
    expect(component.errorMessage()).toBe('No pudimos cargar el ROI por herramienta.');
    expect(component.loading()).toBe(false);
  });

  it('formatPct agrega el símbolo % con un decimal, incluyendo valores negativos', () => {
    fixture.detectChanges();
    expect(component.formatPct(145.7)).toBe('145,7%');
    expect(component.formatPct(-12.3)).toBe('-12,3%');
  });
});
