import { Directive, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { InventoryService } from './inventory.service';
import { ToolUnitListItem } from '../models/inventory.models';

export const UNIT_SEARCH_PAGE_SIZE = 20;

/**
 * Búsqueda + paginación de `GET /inventory/units` (`q`, `page`, `pageSize`,
 * debounce de 300ms), compartida entre `UnitListComponent` (HU-13.1
 * reducido) y `AlmacenDashboardComponent` (dashboard "Almacén",
 * 2026-09-14) — antes duplicada byte a byte entre ambos, lo que hacía
 * fallar el Quality Gate de duplicación de SonarCloud.
 */
@Directive()
export abstract class PaginatedUnitSearchBase implements OnInit, OnDestroy {
  protected readonly inventory = inject(InventoryService);
  protected readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly items = signal<ToolUnitListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = UNIT_SEARCH_PAGE_SIZE;

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
