import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { InventoryService } from '../../core/inventory/inventory.service';
import { ToolUnitListItem } from '../../core/models/inventory.models';

const PAGE_SIZE = 20;

/**
 * HU-13.1 reducido (Issue #147 — trabajo adicional del mismo sprint): lista
 * y búsqueda simple de unidades físicas para el rol almacenista, SIN las 4
 * tarjetas de KPIs ni el filtro por estado del panel completo de
 * `apps/panel-admin` (`InventoryPanelComponent`) — alcance confirmado por el
 * Tech Lead. Cada fila navega a `unidades/:id`
 * (`UnitDetailComponent`, ya existente en este remote).
 *
 * `GET /inventory/units` (openapi.yaml líneas 376-434), con `q` (código QR,
 * serial o nombre de modelo) y paginación; debounce de 300ms para no
 * martillar la API en cada tecla.
 */
@Component({
  selector: 'app-unit-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './unit-list.component.html',
  styleUrl: './unit-list.component.scss',
})
export class UnitListComponent implements OnInit, OnDestroy {
  private readonly inventory = inject(InventoryService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly items = signal<ToolUnitListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;

  ngOnInit(): void {
    this.load();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.inventory
      .listUnits({
        q: this.searchControl.value || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No pudimos cargar el inventario de unidades.');
          this.loading.set(false);
        },
      });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.page.set(page);
    this.load();
  }
}
