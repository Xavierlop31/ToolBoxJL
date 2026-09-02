import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { InventoryService } from '../../../../core/inventory/inventory.service';
import { ToolModelOption, ToolUnit } from '../../../../core/models/inventory.models';

/**
 * Modal de "+ Registrar Nueva Unidad" / "Generar Nuevo QR" (HU-13.2,
 * Issue #148) — features/13_gestion_inventario_qr.feature:
 * "Apertura del formulario de registro desde el panel" y "Registro exitoso
 * y generación de QR imprimible".
 *
 * `POST /inventory/units` (openapi.yaml líneas 339-374) exige
 * `modelo_id`, `numero_serie`, `fecha_adquisicion`, `costo_compra` y
 * `ubicacion_bodega`. La respuesta trae `qr_code_url` (data URI PNG) que se
 * muestra en una vista previa imprimible junto al `numero_serie` — el
 * backend no genera un identificador legible adicional tipo
 * "TBJL-DEM-0089" (ver la nota de esa misma sección de openapi.yaml): el
 * `numero_serie` que ingresa el almacenista cumple ese rol.
 */
@Component({
  selector: 'app-register-unit-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register-unit-modal.component.html',
  styleUrl: './register-unit-modal.component.scss',
})
export class RegisterUnitModalComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly formBuilder = inject(FormBuilder);

  @Output() readonly closed = new EventEmitter<void>();
  /** Emitido tras el alta exitosa — el panel contenedor refresca KPIs/tabla. */
  @Output() readonly created = new EventEmitter<ToolUnit>();

  readonly models = signal<ToolModelOption[]>([]);
  readonly loadingModels = signal(true);

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly createdUnit = signal<ToolUnit | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    modelo_id: ['', Validators.required],
    numero_serie: ['', Validators.required],
    fecha_adquisicion: ['', Validators.required],
    costo_compra: [0, [Validators.required, Validators.min(1)]],
    ubicacion_bodega: ['', Validators.required],
  });

  ngOnInit(): void {
    this.inventory.listModelOptions().subscribe({
      next: (models) => {
        this.models.set(models);
        this.loadingModels.set(false);
      },
      error: () => {
        this.loadingModels.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    this.inventory.createUnit(this.form.getRawValue()).subscribe({
      next: (unit) => {
        this.submitting.set(false);
        this.createdUnit.set(unit);
        this.created.emit(unit);
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(
          err?.error?.message ?? 'No pudimos registrar la unidad. Intenta de nuevo.',
        );
      },
    });
  }

  nombreModelo(modeloId: string): string {
    const modelo = this.models().find((m) => m.id === modeloId);
    return modelo ? `${modelo.nombre} — ${modelo.marca}` : modeloId;
  }

  imprimir(): void {
    window.print();
  }

  close(): void {
    this.closed.emit();
  }
}
