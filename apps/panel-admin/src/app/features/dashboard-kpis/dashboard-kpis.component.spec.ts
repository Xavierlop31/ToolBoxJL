import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { DashboardKpisComponent } from './dashboard-kpis.component';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { InventoryService } from '../../core/inventory/inventory.service';
import { DashboardKpis, RoiItem } from '../../core/models/analytics.models';
import { MaintenanceUnit } from '../../core/models/inventory.models';

describe('DashboardKpisComponent', () => {
  let fixture: ComponentFixture<DashboardKpisComponent>;
  let component: DashboardKpisComponent;
  let analyticsSpy: jasmine.SpyObj<AnalyticsService>;
  let inventorySpy: jasmine.SpyObj<InventoryService>;

  const mockKpis: DashboardKpis = {
    ingresos_totales_mes: 12_500_000,
    variacion_ingresos_pct: 8.4,
    ocupacion_global_pct: 68.3,
    moras_recaudadas_mes: 450_000,
    roi_promedio_pct: 24.1,
    equipos_activos: 2_410,
    tasa_entregas_exitosas_pct: 94.2,
    amortizacion_meses: 18,
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

  const mockRoi: RoiItem[] = [
    { modelo_id: 'm1', modelo_nombre: 'Taladro Percutor 20V', roi_pct: 145.7, margen_neto_cop: 700_000 },
    { modelo_id: 'm2', modelo_nombre: 'Andamio Modular 2m', roi_pct: -12.3, margen_neto_cop: -60_000 },
  ];

  const mockMaintenance: MaintenanceUnit[] = [
    {
      id: 'u1',
      modelo_id: 'm1',
      modelo_nombre: 'Taladro Percutor 20V',
      numero_serie: 'SN-1',
      estado: 'En Mantenimiento',
      fecha_ingreso: '2026-01-01',
      qr_code_url: 'data:image/png;base64,',
      fecha_adquisicion: null,
      costo_compra: null,
      ubicacion_bodega: null,
      ultimo_evento_mantenimiento: {
        id: 'ev-1',
        unidad_id: 'u1',
        estado_anterior: 'Operativo',
        estado_nuevo: 'En Mantenimiento',
        fotos_urls: [],
        autor_id: 'autor-1',
        created_at: '2026-08-01T00:00:00.000Z',
        falla_reportada: 'No enciende',
      },
    },
  ];

  function setup(): void {
    fixture = TestBed.createComponent(DashboardKpisComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    analyticsSpy = jasmine.createSpyObj('AnalyticsService', ['getDashboardKpis', 'getRoi']);
    analyticsSpy.getRoi.and.returnValue(of(mockRoi));
    inventorySpy = jasmine.createSpyObj('InventoryService', ['listMaintenance']);
    inventorySpy.listMaintenance.and.returnValue(of(mockMaintenance));

    TestBed.configureTestingModule({
      imports: [DashboardKpisComponent],
      providers: [
        { provide: AnalyticsService, useValue: analyticsSpy },
        { provide: InventoryService, useValue: inventorySpy },
      ],
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

  it('formatAmortizacion redondea los meses y usa singular/plural correctamente', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
    setup();

    expect(component.formatAmortizacion(18)).toBe('Amortización a 18 meses');
    expect(component.formatAmortizacion(1.4)).toBe('Amortización a 1 mes');
    expect(component.formatAmortizacion(null)).toBeNull();
  });

  it('HU-15.1 extendido: renderiza equipos activos y tasa de entregas exitosas, omite el subtítulo de amortización si es null', () => {
    analyticsSpy.getDashboardKpis.and.returnValue(of({ ...mockKpis, amortizacion_meses: null }));
    setup();
    fixture.detectChanges();

    const equiposActivos = fixture.debugElement.query(By.css('[data-testid="kpi-equipos-activos"]'));
    expect(equiposActivos.nativeElement.textContent).toContain('2.410 equipos activos');

    const entregas = fixture.debugElement.query(By.css('[data-testid="kpi-entregas-exitosas"]'));
    expect(entregas.nativeElement.textContent).toContain('94.2%');

    const amortizacion = fixture.debugElement.query(By.css('[data-testid="kpi-amortizacion"]'));
    expect(amortizacion).toBeFalsy();
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

  describe('widget de rentabilidad (Top 5/Bottom 5)', () => {
    beforeEach(() => {
      analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
      setup();
      fixture.detectChanges();
    });

    it('por defecto ordena por ROI % de mayor a menor en Top 5 y de menor a mayor en Bottom 5', () => {
      expect(component.top5().map((i) => i.modelo_id)).toEqual(['m1', 'm2']);
      expect(component.bottom5().map((i) => i.modelo_id)).toEqual(['m2', 'm1']);
    });

    it('formatRankingValor muestra % con roi_pct y COP con margen_neto_cop, según la métrica activa', () => {
      expect(component.formatRankingValor(mockRoi[0])).toBe('145.7%');
      component.rankingMetrica.set('margen_neto_cop');
      expect(component.formatRankingValor(mockRoi[0])).toContain('700.000');
    });

    it('rankingValorNegativo detecta el signo según la métrica activa', () => {
      expect(component.rankingValorNegativo(mockRoi[1])).toBe(true);
      expect(component.rankingValorNegativo(mockRoi[0])).toBe(false);
    });

    it('el botón de métrica activa cambia rankingMetrica al hacer click', () => {
      const botonMargen = fixture.debugElement.query(By.css('[data-testid="ranking-metrica-margen"]'));
      botonMargen.nativeElement.click();

      expect(component.rankingMetrica()).toBe('margen_neto_cop');
    });

    it('muestra un mensaje de error si falla la carga de ROI, sin tumbar el resto del dashboard', () => {
      analyticsSpy.getRoi.and.returnValue(throwError(() => new Error('boom')));
      setup();
      fixture.detectChanges();

      expect(component.roiErrorMessage()).toBe('No pudimos cargar el análisis de rentabilidad por equipo.');
      expect(component.kpis()).toEqual(mockKpis);
    });
  });

  describe('widget de Alertas de Mantenimiento', () => {
    it('renderiza las primeras unidades de GET /inventory/maintenance', () => {
      analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
      setup();
      fixture.detectChanges();

      const rows = fixture.debugElement.queryAll(By.css('[data-testid="alerta-mantenimiento-row"]'));
      expect(rows.length).toBe(1);
      expect(rows[0].nativeElement.textContent).toContain('Taladro Percutor 20V');
      expect(rows[0].nativeElement.textContent).toContain('No enciende');
    });

    it('muestra el mensaje vacío cuando no hay unidades en mantenimiento', () => {
      inventorySpy.listMaintenance.and.returnValue(of([]));
      analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
      setup();
      fixture.detectChanges();

      const empty = fixture.debugElement.query(By.css('[data-testid="alertas-mantenimiento-empty"]'));
      expect(empty).toBeTruthy();
    });

    it('muestra un mensaje de error si falla la carga, sin tumbar el resto del dashboard', () => {
      inventorySpy.listMaintenance.and.returnValue(throwError(() => new Error('boom')));
      analyticsSpy.getDashboardKpis.and.returnValue(of(mockKpis));
      setup();
      fixture.detectChanges();

      expect(component.maintenanceErrorMessage()).toBe('No pudimos cargar las alertas de mantenimiento.');
      expect(component.kpis()).toEqual(mockKpis);
    });
  });
});
