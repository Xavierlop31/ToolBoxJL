import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { DashboardKpisComponent } from './dashboard-kpis.component';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { DashboardKpis } from '../../core/models/analytics.models';

describe('DashboardKpisComponent', () => {
  let fixture: ComponentFixture<DashboardKpisComponent>;
  let component: DashboardKpisComponent;
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;

  const mockKpis: DashboardKpis = {
    ingresos_totales_mes: 12_500_000,
    variacion_ingresos_pct: 8.4,
    ocupacion_global_pct: 68.3,
    moras_recaudadas_mes: 450_000,
    roi_promedio_pct: 24.1,
    alertas_criticas: [
      {
        tipo: 'mantenimiento_recurrente',
        severidad: 'alta',
        titulo: 'Unidad con mantenimiento recurrente',
        descripcion: 'Más de 3 ingresos a taller este mes.',
        referencia_id: '11111111-1111-1111-1111-111111111111',
        accion_sugerida: 'Revisar Ficha / Dar de Baja',
      },
      {
        tipo: 'mora_cliente',
        severidad: 'media',
        titulo: 'Cliente en mora',
        descripcion: 'Orden con 6 días de atraso.',
        referencia_id: '22222222-2222-2222-2222-222222222222',
        accion_sugerida: 'Ver Contrato / Contactar',
      },
    ],
  };

  function setup(): void {
    fixture = TestBed.createComponent(DashboardKpisComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', ['getDashboardKpis']);

    TestBed.configureTestingModule({
      imports: [DashboardKpisComponent],
      providers: [{ provide: AnalyticsService, useValue: analyticsSpy }],
    });
  });

  it('muestra el estado de carga mientras consulta el endpoint', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
    setup();

    expect(component.loading()).toBe(true);
  });

  it('HU-15.1: carga los 4 KPIs consolidados al iniciar', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
    setup();
    fixture.detectChanges();

    expect(analyticsSpy.getDashboardKpis).toHaveBeenCalled();
    expect(component.kpis()).toEqual(mockKpis);
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('formatea los montos en COP sin decimales', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
    setup();

    expect(component.formatCop(12_500_000)).toContain('12.500.000');
  });

  it('formatea porcentajes con un decimal', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
    setup();

    expect(component.formatPct(68.3)).toBe('68.3%');
  });

  it('determina el signo de la variación de ingresos: positivo, negativo y cero', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
    setup();

    expect(component.variacionSigno(8.4)).toBe('up');
    expect(component.variacionSigno(-3.2)).toBe('down');
    expect(component.variacionSigno(0)).toBe('flat');
  });

  it('setea un mensaje de error y limpia los KPIs si la consulta falla', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(throwError(() => new Error('network error')));
    setup();
    fixture.detectChanges();

    expect(component.kpis()).toBeNull();
    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBe('No pudimos cargar el dashboard gerencial.');
  });

  it('renderiza 0 alertas críticas mostrando el mensaje vacío', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(
      of({ ...mockKpis, alertas_criticas: [] }),
    );
    setup();
    fixture.detectChanges();

    expect(component.alertasCriticas().length).toBe(0);
    const empty = fixture.debugElement.query(By.css('[data-testid="alertas-criticas-empty"]'));
    expect(empty).toBeTruthy();
  });

  it('renderiza varias tarjetas de alerta con su badge de severidad correspondiente', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
    setup();
    fixture.detectChanges();

    const rows = fixture.debugElement.queryAll(By.css('[data-testid="alerta-critica-row"]'));
    expect(rows.length).toBe(2);

    expect(component.severidadBadgeClass('alta')).toBe('badge-severidad-alta');
    expect(component.severidadBadgeClass('media')).toBe('badge-severidad-media');
    expect(component.severidadBadgeClass('informativa')).toBe('badge-severidad-informativa');
  });

  it('renderiza el texto exacto del botón de acción sugerida por alerta', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
    setup();
    fixture.detectChanges();

    const botones = fixture.debugElement.queryAll(
      By.css('[data-testid="alerta-critica-accion"]'),
    );
    expect(botones[0].nativeElement.textContent.trim()).toBe('Revisar Ficha / Dar de Baja');
    expect(botones[1].nativeElement.textContent.trim()).toBe('Ver Contrato / Contactar');
  });
});
