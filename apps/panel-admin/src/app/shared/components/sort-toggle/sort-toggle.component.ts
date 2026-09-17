import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type SortDirection = 'asc' | 'desc';

/**
 * Botón de orden compartido por roi-dashboard/utilization-productivity-dashboard
 * (bug reportado: "tener la posibilidad de organizarlos de mayor a menor o
 * viceversa"). El ordenamiento en sí lo hace cada página (los datos ya están
 * completos en memoria, sin paginación) — este componente solo alterna y
 * emite la dirección.
 */
@Component({
  selector: 'app-sort-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="sort-toggle" (click)="toggle()" [attr.aria-label]="ariaLabel()">
      <span aria-hidden="true">{{ direction() === 'desc' ? '↓' : '↑' }}</span>
      {{ label() }}
    </button>
  `,
  styleUrl: './sort-toggle.component.scss',
})
export class SortToggleComponent {
  readonly direction = input<SortDirection>('desc');
  readonly directionChange = output<SortDirection>();

  readonly label = computed(() =>
    this.direction() === 'desc' ? 'Mayor a menor' : 'Menor a mayor',
  );
  readonly ariaLabel = computed(() => `Orden actual: ${this.label()}. Cambiar orden.`);

  toggle(): void {
    this.directionChange.emit(this.direction() === 'desc' ? 'asc' : 'desc');
  }
}
