import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { AnalyticsService } from '../../core/analytics/analytics.service';
import { RevenueBreakdown } from '../../core/models/analytics.models';

/**
 * Dashboard de ingresos totales desglosados (HU-7.1, Issue #19) —
 * features/07_kpis_analitica.feature @HU-7.1: "Gerente consulta ingresos
 * totales desglosados". Selector de periodo (mes calendario, `<input
 * type="month">`) + `GET /analytics/revenue?periodo=...`
 * (AnalyticsService) + presentación desglosada de los 4 valores
 * (`ventas_directas`, `tarifas_alquiler`, `cobros_mora`, `total`) en COP —
 * eso cubre el "Entonces veo los ingresos totales desglosados en Ventas
 * Directas, Tarifas de Alquiler y Cobros por Mora para ese periodo" del
 * escenario.
 */
@Component({
  selector: 'app-revenue-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './revenue-dashboard.component.html',
  styleUrl: './revenue-dashboard.component.scss',
})
export class RevenueDashboardComponent implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly formBuilder = inject(FormBuilder);

  private readonly copFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  readonly periodoControl = this.formBuilder.nonNullable.control(
    this.periodoActual(),
  );

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly revenue = signal<RevenueBreakdown | null>(null);

  ngOnInit(): void {
    this.consultar();
  }

  consultar(): void {
    const periodo = this.periodoControl.value;
    if (!periodo) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.analytics.getRevenue(periodo).subscribe({
      next: (revenue) => {
        this.revenue.set(revenue);
        this.loading.set(false);
      },
      error: () => {
        this.revenue.set(null);
        this.errorMessage.set('No pudimos cargar los ingresos de este periodo.');
        this.loading.set(false);
      },
    });
  }

  formatCop(valor: number): string {
    return this.copFormatter.format(valor);
  }

  /** Mes calendario actual en formato `YYYY-MM`, valor inicial del selector. */
  private periodoActual(): string {
    const now = new Date();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${mes}`;
  }
}
