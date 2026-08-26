import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AnalyticsService } from '../../core/analytics/analytics.service';
import { RoiItem } from '../../core/models/analytics.models';

/**
 * Dashboard de ROI por herramienta (HU-7.2, Issue #20) —
 * features/07_kpis_analitica.feature, escenario "Gerente consulta el ROI
 * por herramienta": "Cuando consulto el ROI de un modelo específico /
 * Entonces el sistema calcula (Ingresos Acumulados − Costo de Compra) /
 * Costo de Compra × 100 para ese modelo". El cálculo lo hace el backend
 * (`roi_pct` ya viene calculado, openapi.yaml líneas 876-900); esta UI
 * ofrece un selector opcional de `modelo_id` (`GET /analytics/roi`, mismo
 * patrón que revenue-dashboard) — con el campo vacío se listan todos los
 * modelos, con un `modelo_id` cargado se filtra a ese modelo específico.
 */
@Component({
  selector: 'app-roi-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './roi-dashboard.component.html',
  styleUrl: './roi-dashboard.component.scss',
})
export class RoiDashboardComponent implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly formBuilder = inject(FormBuilder);

  private readonly pctFormatter = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 1,
  });

  readonly modeloIdControl = this.formBuilder.nonNullable.control('');

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly roi = signal<RoiItem[]>([]);

  ngOnInit(): void {
    this.consultar();
  }

  consultar(): void {
    const modeloId = this.modeloIdControl.value.trim();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.analytics.getRoi(modeloId || undefined).subscribe({
      next: (roi) => {
        this.roi.set(roi);
        this.loading.set(false);
      },
      error: () => {
        this.roi.set([]);
        this.errorMessage.set('No pudimos cargar el ROI por herramienta.');
        this.loading.set(false);
      },
    });
  }

  formatPct(valor: number): string {
    return `${this.pctFormatter.format(valor)}%`;
  }
}
