import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CatalogService } from '../../core/catalog/catalog.service';
import { ToolModel } from '../../core/models/catalog.models';
import { ActiveOrdersComponent } from '../active-orders/active-orders.component';

import { getToolImageUrl, FALLBACK_TOOL_IMAGE } from '../../core/utils/tool-image.util';

export const PAGE_SIZES = [6, 12, 24] as const;

/**
 * Búsqueda pública de catálogo — RF-1.1 (visibilidad del catálogo),
 * features/01_catalogo_inventario.feature. Consume `GET /catalog/search`
 * (público, sin auth requerida — openapi.yaml línea 67).
 */
@Component({
  selector: 'app-catalog-search',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, ActiveOrdersComponent],
  templateUrl: './catalog-search.component.html',
  styleUrl: './catalog-search.component.scss',
})
export class CatalogSearchComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly catalog = inject(CatalogService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly results = signal<ToolModel[]>([]);

  readonly selectedCategory = signal<string>('ALL');

  // Paginación (HU-12.1) — page 1-based, pageSize uno de PAGE_SIZES.
  readonly pageSizes = PAGE_SIZES;
  readonly page = signal(1);
  readonly pageSize = signal<(typeof PAGE_SIZES)[number]>(6);
  readonly total = signal(0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  readonly form = this.formBuilder.nonNullable.group({
    q: [''],
  });

  ngOnInit(): void {
    this.search();
  }

  getToolImage(model: ToolModel): string {
    return getToolImageUrl(model);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== FALLBACK_TOOL_IMAGE) {
      target.src = FALLBACK_TOOL_IMAGE;
    }
  }

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
    if (cat === 'ALL') {
      this.form.patchValue({ q: '' });
    } else {
      this.form.patchValue({ q: cat });
    }
    this.page.set(1);
    this.search();
  }

  setPageSize(size: (typeof PAGE_SIZES)[number]): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.search();
  }

  onPageSizeChange(value: string): void {
    const size = Number(value);
    if (PAGE_SIZES.includes(size as (typeof PAGE_SIZES)[number])) {
      this.setPageSize(size as (typeof PAGE_SIZES)[number]);
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.search();
  }

  search(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const query = this.form.getRawValue().q?.trim() || undefined;
    this.catalog.searchPaged({ q: query }, this.page(), this.pageSize()).subscribe({
      next: ({ items, total }) => {
        this.results.set(items);
        this.total.set(total);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar el catálogo. Intentá de nuevo.');
        this.loading.set(false);
      },
    });
  }
}

