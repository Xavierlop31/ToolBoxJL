import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { InventoryService } from '../../core/inventory/inventory.service';
import { ToolModelOption, ToolUnit } from '../../core/models/inventory.models';

/**
 * Alta de unidad física + generación de QR (HU-13.2, Issue #147 — trabajo
 * adicional del mismo sprint, espejo reducido de
 * `apps/panel-admin` — `RegisterUnitModalComponent`) —
 * features/13_gestion_inventario_qr.feature: "Registro exitoso y generación
 * de QR imprimible".
 *
 * `POST /inventory/units` (openapi.yaml líneas 339-374) exige `modelo_id`,
 * `numero_serie`, `fecha_adquisicion`, `costo_compra` y `ubicacion_bodega`.
 * La respuesta trae `qr_code_url` (data URI PNG) que se muestra en una
 * vista previa imprimible junto al `numero_serie` — el backend no genera un
 * identificador legible adicional: el `numero_serie` que ingresa el
 * almacenista cumple ese rol.
 *
 * A diferencia del cambio de estado (`UnitDetailComponent`), esta pantalla
 * NO usa la cola offline: el alta de una unidad nueva necesita confirmar
 * contra el catálogo real (`modelo_id` existente), así que no tiene sentido
 * diferirla sin conectividad.
 */
@Component({
  selector: 'app-register-unit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-unit.component.html',
  styleUrl: './register-unit.component.scss',
})
export class RegisterUnitComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly formBuilder = inject(FormBuilder);

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

  registrarOtra(): void {
    this.createdUnit.set(null);
    this.form.reset({
      modelo_id: '',
      numero_serie: '',
      fecha_adquisicion: '',
      costo_compra: 0,
      ubicacion_bodega: '',
    });
  }
}
