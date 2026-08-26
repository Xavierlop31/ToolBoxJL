import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AnalyticsService } from '../../core/analytics/analytics.service';
import {
  DeliveryProductivity,
  UtilizationSummary,
} from '../../core/models/analytics.models';

/**
 * Dashboard combinado de utilización de inventario y productividad de
 * repartidores (HU-7.3, Issue #21) —
 * features/07_kpis_analitica.feature, escenario "Gerente consulta
 * utilización de inventario y productividad de repartidores del mes":
 * - "veo la Utilización como Días Alquilada entre Días Disponibles del
 *   mes" → `GET /analytics/utilization` (utilización global + por modelo,
 *   openapi.yaml líneas 902-926).
 * - "veo la Productividad como Entregas Exitosas entre Ruta Asignada,
 *   junto con el tiempo promedio por punto" → `GET
 *   /analytics/delivery-productivity` (por repartidor, openapi.yaml
 *   líneas 928-950).
 *
 * Ninguno de los dos endpoints acepta parámetros de periodo en el
 * contrato (a diferencia de `/analytics/revenue`), por eso se cargan en
 * paralelo con `forkJoin` al entrar al dashboard, sin selector de fecha —
 * un botón "Actualizar" permite refrescar ambos.
 */
@Component({
  selector: 'app-utilization-productivity-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './utilization-productivity-dashboard.component.html',
  styleUrl: './utilization-productivity-dashboard.component.scss',
})
export class UtilizationProductivityDashboardComponent implements OnInit {
  private readonly analytics = inject(AnalyticsService);

  private readonly pctFormatter = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 1,
  });

  private readonly minFormatter = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 1,
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly utilization = signal<UtilizationSummary | null>(null);
  readonly productivity = signal<DeliveryProductivity[]>([]);

  ngOnInit(): void {
    this.consultar();
  }

  consultar(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      utilization: this.analytics.getUtilization(),
      productivity: this.analytics.getDeliveryProductivity(),
    }).subscribe({
      next: ({ utilization, productivity }) => {
        this.utilization.set(utilization);
        this.productivity.set(productivity);
        this.loading.set(false);
      },
      error: () => {
        this.utilization.set(null);
        this.productivity.set([]);
        this.errorMessage.set(
          'No pudimos cargar la utilización de inventario y la productividad de repartidores.',
        );
        this.loading.set(false);
      },
    });
  }

  formatPct(valor: number): string {
    return `${this.pctFormatter.format(valor)}%`;
  }

  formatMin(valor: number): string {
    return `${this.minFormatter.format(valor)} min`;
  }

  /** Entregas Exitosas entre Ruta Asignada, expresado en % (Gherkin). */
  productividadPct(item: DeliveryProductivity): string {
    if (item.ruta_asignada === 0) {
      return 'N/D';
    }
    return this.formatPct((item.entregas_exitosas / item.ruta_asignada) * 100);
  }
}
