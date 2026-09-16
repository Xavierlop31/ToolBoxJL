import { Component, input } from '@angular/core';

/**
 * Tarjeta de KPI del dashboard "Almacén" — las 4 tarjetas
 * (`AlmacenDashboardComponent`) eran el mismo bloque de markup copiado 4
 * veces dentro del mismo archivo (detectado como duplicación por el
 * Quality Gate de SonarCloud).
 */
@Component({
  selector: 'app-metric-card',
  standalone: true,
  template: `
    <div class="metric-card" [class]="variantClass()" [attr.data-testid]="testId()">
      <div class="metric-top-bar"></div>
      <div class="metric-header">
        <dt>{{ label() }}</dt>
        <span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span>
      </div>
      <dd>{{ value() }}</dd>
    </div>
  `,
  styleUrl: './metric-card.component.scss',
})
export class MetricCardComponent {
  readonly variantClass = input.required<string>();
  readonly testId = input.required<string>();
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
  readonly value = input.required<number>();
}
