import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AnalyticsService } from '../../core/analytics/analytics.service';
import { InventoryService } from '../../core/inventory/inventory.service';
import { AlertaCritica, DashboardKpis, RoiItem, SeveridadAlertaCritica } from '../../core/models/analytics.models';
import { MaintenanceUnit } from '../../core/models/inventory.models';

/** Métrica por la que se ordena el widget de Top 5/Bottom 5 Rentabilidad. */
type MetricaRanking = 'roi_pct' | 'margen_neto_cop';

/**
 * Dashboard ejecutivo consolidado (HU-15.1, Sprint 15, Fase 3, Épica 15 —
 * Issue #153), diseño Stitch "Dashboard KPIs - Rediseño Gerencial") —
 * features/15_dashboard_kpis_gerencial.feature, @HU-15.1:
 * - "Visualización de KPIs ejecutivos de alto impacto": 4 tarjetas
 *   (Ingresos Totales del Mes con variación %, Ocupación Global de Flota,
 *   Total Recaudado por Moras, ROI Promedio).
 * - "Panel de Alertas Críticas del Negocio": tarjetas clasificadas por
 *   severidad con botón de acción sugerida.
 *
 * `GET /analytics/dashboard-kpis` (AnalyticsService.getDashboardKpis) en una
 * sola llamada — no compone `/analytics/revenue` + `/analytics/roi` +
 * `/analytics/utilization` (esos siguen existiendo para sus propios
 * dashboards de detalle, ver revenue-dashboard/roi-dashboard/
 * utilization-productivity-dashboard).
 *
 * Extendido (mockup "Dashboard Gerencial" pasado por el Arquitecto): se
 * agregaron 2 tarjetas — Utilización de Inventario (+ equipos activos) y
 * Tasa de Entregas Exitosas — SIN quitar las 4 originales de HU-15.1
 * (decisión explícita del Arquitecto: "agregar sin quitar"). La tarjeta
 * ROI Promedio ganó un subtítulo de amortización estimada
 * (`amortizacion_meses`), omitido cuando no hay suficiente historial para
 * una estimación confiable (no se inventa el dato).
 *
 * También se agregaron 2 widgets nuevos, con carga y error independientes
 * de los KPIs principales (uno puede fallar sin tumbar el resto de la
 * página):
 * - "Análisis de Rentabilidad por Equipo" (Top 5/Bottom 5): reusa
 *   `GET /analytics/roi` (mismo endpoint que roi-dashboard, ya trae
 *   `modelo_nombre`/`margen_neto_cop` desde el fix de GUID de Workstream D)
 *   — el orden es 100% client-side, con un toggle ROI %/Margen Neto COP.
 * - "Alertas de Mantenimiento": primeras 3 unidades de
 *   `GET /inventory/maintenance` (mismo endpoint que ya usa
 *   `MaintenanceTabComponent`) — dato real, sin inventar un motor de
 *   priorización que no existe.
 *
 * Alcance visual deliberadamente acotado: NO replica el mapa de operaciones
 * en vivo ni el widget "Recomendaciones de Flota" del mockup de Stitch —
 * decorativos, sin HU/endpoint que los respalde con datos reales
 * (instrucción explícita del Arquitecto).
 */
@Component({
  selector: 'app-dashboard-kpis',
  standalone: true,
  templateUrl: './dashboard-kpis.component.html',
  styleUrl: './dashboard-kpis.component.scss',
})
export class DashboardKpisComponent implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly inventory = inject(InventoryService);

  private readonly copFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  private readonly enteroFormatter = new Intl.NumberFormat('es-CO');

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly kpis = signal<DashboardKpis | null>(null);

  readonly alertasCriticas = computed<AlertaCritica[]>(() => this.kpis()?.alertas_criticas ?? []);

  readonly roi = signal<RoiItem[]>([]);
  readonly roiErrorMessage = signal<string | null>(null);
  readonly rankingMetrica = signal<MetricaRanking>('roi_pct');
  readonly top5 = computed(() => this.ordenarRoi('desc').slice(0, 5));
  readonly bottom5 = computed(() => this.ordenarRoi('asc').slice(0, 5));

  readonly maintenance = signal<MaintenanceUnit[]>([]);
  readonly maintenanceErrorMessage = signal<string | null>(null);
  readonly alertasMantenimiento = computed(() => this.maintenance().slice(0, 3));

  ngOnInit(): void {
    this.load();
    this.loadRoi();
    this.loadMaintenance();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.analytics.getDashboardKpis().subscribe({
      next: (kpis) => {
        this.kpis.set(kpis);
        this.loading.set(false);
      },
      error: () => {
        this.kpis.set(null);
        this.errorMessage.set('No pudimos cargar el dashboard gerencial.');
        this.loading.set(false);
      },
    });
  }

  private loadRoi(): void {
    this.roiErrorMessage.set(null);
    this.analytics.getRoi().subscribe({
      next: (roi) => this.roi.set(roi),
      error: () => {
        this.roi.set([]);
        this.roiErrorMessage.set('No pudimos cargar el análisis de rentabilidad por equipo.');
      },
    });
  }

  private loadMaintenance(): void {
    this.maintenanceErrorMessage.set(null);
    this.inventory.listMaintenance().subscribe({
      next: (units) => this.maintenance.set(units),
      error: () => {
        this.maintenance.set([]);
        this.maintenanceErrorMessage.set('No pudimos cargar las alertas de mantenimiento.');
      },
    });
  }

  private ordenarRoi(dir: 'asc' | 'desc'): RoiItem[] {
    const metrica = this.rankingMetrica();
    return [...this.roi()].sort((a, b) =>
      dir === 'desc' ? b[metrica] - a[metrica] : a[metrica] - b[metrica],
    );
  }

  formatRankingValor(item: RoiItem): string {
    return this.rankingMetrica() === 'roi_pct' ? this.formatPct(item.roi_pct) : this.formatCop(item.margen_neto_cop);
  }

  rankingValorNegativo(item: RoiItem): boolean {
    return this.rankingMetrica() === 'roi_pct' ? item.roi_pct < 0 : item.margen_neto_cop < 0;
  }

  /** Clase de badge del widget de Alertas de Mantenimiento — mismo criterio visual que MaintenanceTabComponent. */
  maintenanceBadgeClass(unidad: MaintenanceUnit): string {
    return unidad.estado === 'Dado de Baja' ? 'badge-baja' : 'badge-mantenimiento';
  }

  formatCop(valor: number): string {
    return this.copFormatter.format(valor);
  }

  formatEntero(valor: number): string {
    return this.enteroFormatter.format(valor);
  }

  formatPct(valor: number): string {
    return `${valor.toFixed(1)}%`;
  }

  /** Subtítulo de la tarjeta ROI Promedio — omitido si no hay suficiente historial (ver doc-comment de amortizacion_meses en analytics.models.ts). */
  formatAmortizacion(meses: number | null): string | null {
    if (meses === null) {
      return null;
    }
    const redondeado = Math.round(meses);
    return `Amortización a ${redondeado} ${redondeado === 1 ? 'mes' : 'meses'}`;
  }

  /** Signo de la variación de ingresos: 'up' si sube, 'down' si baja, 'flat' si es 0. */
  variacionSigno(valor: number): 'up' | 'down' | 'flat' {
    if (valor > 0) return 'up';
    if (valor < 0) return 'down';
    return 'flat';
  }

  severidadBadgeClass(severidad: SeveridadAlertaCritica): string {
    switch (severidad) {
      case 'alta':
        return 'badge-severidad-alta';
      case 'media':
        return 'badge-severidad-media';
      case 'informativa':
        return 'badge-severidad-informativa';
    }
  }

  severidadLabel(severidad: SeveridadAlertaCritica): string {
    switch (severidad) {
      case 'alta':
        return 'Alta';
      case 'media':
        return 'Media';
      case 'informativa':
        return 'Informativa';
    }
  }
}
