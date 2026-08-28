import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CatalogService } from '../../core/catalog/catalog.service';
import { ToolModel } from '../../core/models/catalog.models';

/**
 * Búsqueda pública de catálogo — RF-1.1 (visibilidad del catálogo),
 * features/01_catalogo_inventario.feature. Consume `GET /catalog/search`
 * (público, sin auth requerida — openapi.yaml línea 67).
 */
@Component({
  selector: 'app-catalog-search',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
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

  readonly form = this.formBuilder.nonNullable.group({
    q: [''],
  });

  ngOnInit(): void {
    this.search();
  }

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
    if (cat === 'ALL') {
      this.form.patchValue({ q: '' });
    } else {
      this.form.patchValue({ q: cat });
    }
    this.search();
  }

  search(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const query = this.form.getRawValue().q?.trim() || undefined;
    this.catalog.search({ q: query }).subscribe({
      next: (models) => {
        this.results.set(models);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar el catálogo. Intentá de nuevo.');
        this.loading.set(false);
      },
    });
  }
}
