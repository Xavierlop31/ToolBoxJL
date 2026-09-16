import { Component, input } from '@angular/core';

/**
 * Tarjeta de widget del dashboard "Almacén" (Ocupación de Almacén /
 * Auditoría en Vivo) — mismo encabezado (ícono + título + hint) repetido
 * en `AlmacenDashboardComponent`, detectado como duplicación por el
 * Quality Gate de SonarCloud. El contenido específico de cada widget se
 * proyecta vía `<ng-content>`.
 */
@Component({
  selector: 'app-widget-card',
  standalone: true,
  template: `
    <div class="widget" [attr.data-testid]="testId()">
      <div class="widget-title">
        <span class="material-symbols-outlined" aria-hidden="true">{{ icon() }}</span>
        <h2>{{ title() }}</h2>
      </div>
      <p class="widget-hint">{{ hint() }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styleUrl: './widget-card.component.scss',
})
export class WidgetCardComponent {
  readonly testId = input.required<string>();
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly hint = input.required<string>();
}
