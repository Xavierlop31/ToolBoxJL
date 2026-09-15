import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * Input de búsqueda de `GET /inventory/units` (código QR, serial o nombre
 * de modelo) — compartido entre `UnitListComponent` y
 * `AlmacenDashboardComponent`, antes copiado literalmente en ambos
 * (duplicación detectada por el Quality Gate de SonarCloud).
 */
@Component({
  selector: 'app-unit-search-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <input
      type="search"
      placeholder="Buscar por código QR, serial o modelo…"
      [formControl]="control()"
      data-testid="unit-search"
      aria-label="Buscar por código QR, serial o modelo"
    />
  `,
})
export class UnitSearchInputComponent {
  readonly control = input.required<FormControl<string>>();
}
