import { Component, input, output } from '@angular/core';

/**
 * Paginación Anterior/Siguiente sobre `GET /inventory/units` — compartida
 * entre `UnitListComponent` y `AlmacenDashboardComponent`, antes copiada
 * literalmente en ambos (duplicación detectada por el Quality Gate de
 * SonarCloud).
 */
@Component({
  selector: 'app-pagination-nav',
  standalone: true,
  template: `
    <nav class="pagination" [attr.aria-label]="ariaLabel()">
      <button type="button" [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)">Anterior</button>
      <span>Página {{ page() }} de {{ totalPages() }}</span>
      <button type="button" [disabled]="page() >= totalPages()" (click)="pageChange.emit(page() + 1)">
        Siguiente
      </button>
    </nav>
  `,
})
export class PaginationNavComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly ariaLabel = input('Paginación');
  readonly pageChange = output<number>();
}
