import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AnalyticsService } from '../../core/analytics/analytics.service';
import { AlertaCritica, DashboardKpis, SeveridadAlertaCritica } from '../../core/models/analytics.models';

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
 * Alcance visual deliberadamente acotado: NO replica el mapa de operaciones
 * en vivo ni el ranking de "equipos más rentables" del mockup de Stitch —
 * son decorativos, sin HU/endpoint que los respalde con datos reales todavía
 * (instrucción explícita del Tech Lead).
 */
@Component({
  selector: 'app-dashboard-kpis',
  standalone: true,
  templateUrl: './dashboard-kpis.component.html',
  styleUrl: './dashboard-kpis.component.scss',
})
export class DashboardKpisComponent implements OnInit {
  private readonly analytics = inject(AnalyticsService);

  private readonly copFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly kpis = signal<DashboardKpis | null>(null);

  readonly alertasCriticas = computed<AlertaCritica[]>(() => this.kpis()?.alertas_criticas ?? []);

  ngOnInit(): void {
    this.load();
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

  formatCop(valor: number): string {
    return this.copFormatter.format(valor);
  }

  formatPct(valor: number): string {
    return `${valor.toFixed(1)}%`;
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
