import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { CatalogService } from '../../core/catalog/catalog.service';
import { ToolModel } from '../../core/models/catalog.models';

/**
 * Ficha de modelo + consulta de disponibilidad por rango de fechas — RF-1.4:
 * "Cliente consulta disponibilidad real de una herramienta por fechas"
 * (features/01_catalogo_inventario.feature). El resultado muestra
 * únicamente `unidades_disponibles` (unidades físicas no reservadas en el
 * rango), tal como calcula `GET /inventory/check-availability`.
 */
@Component({
  selector: 'app-model-detail',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './model-detail.component.html',
  styleUrl: './model-detail.component.scss',
})
export class ModelDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly formBuilder = inject(FormBuilder);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly model = signal<ToolModel | null>(null);

  readonly availabilityLoading = signal(false);
  readonly availabilityError = signal<string | null>(null);
  readonly unidadesDisponibles = signal<number | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Modelo no encontrado.');
      this.loading.set(false);
      return;
    }

    this.catalog.getModelById(id).subscribe({
      next: (model) => {
        this.model.set(model);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar la ficha del modelo.');
        this.loading.set(false);
      },
    });
  }

  checkAvailability(): void {
    const model = this.model();
    if (!model || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.availabilityLoading.set(true);
    this.availabilityError.set(null);
    this.unidadesDisponibles.set(null);

    const { fechaInicio, fechaFin } = this.form.getRawValue();

    this.catalog.checkAvailability(model.id, fechaInicio, fechaFin).subscribe({
      next: (result) => {
        this.unidadesDisponibles.set(result.unidades_disponibles);
        this.availabilityLoading.set(false);
      },
      error: () => {
        this.availabilityError.set('No pudimos consultar la disponibilidad.');
        this.availabilityLoading.set(false);
      },
    });
  }
}
