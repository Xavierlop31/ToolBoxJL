import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { InventoryService } from '../../../../core/inventory/inventory.service';
import {
  ESTADOS_UNIDAD,
  EstadoUnidad,
  TIPOS_MANTENIMIENTO,
  TipoMantenimiento,
  ToolUnit,
  ToolUnitStatusLogEntry,
  UpdateToolUnitStatusInput,
} from '../../../../core/models/inventory.models';

/**
 * Modal de "Cambiar Estado" (pestaña Inventario General) y de "Reintegrar a
 * Servicio" / "Declarar Baja Definitiva" (pestaña Mantenimiento & Taller) —
 * HU-13.3, Issue #149. `PATCH /inventory/units/{id}/status`
 * (openapi.yaml líneas 506-558) solo exige `estado_nuevo` en el backend;
 * esta UI exige los campos de taller (Tipo, Falla reportada, Técnico
 * asignado, Costo estimado, Fecha prevista de fin) cuando el destino es
 * "En Mantenimiento", y `motivo_baja` cuando el destino es "Dado de Baja" —
 * exactamente los dos escenarios Gherkin "Asignación de una unidad a
 * mantenimiento" y "Retorno a estado operativo o baja definitiva".
 *
 * `presetEstado`: cuando se abre desde la pestaña de Mantenimiento
 * ("Reintegrar a Servicio" → Operativo, "Declarar Baja Definitiva" → Dado
 * de Baja), el destino viene fijo y el selector de estado se oculta; desde
 * "Cambiar Estado" (Inventario General) el usuario elige libremente entre
 * los 5 estados.
 */
@Component({
  selector: 'app-status-change-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './status-change-modal.component.html',
  styleUrl: './status-change-modal.component.scss',
})
export class StatusChangeModalComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly formBuilder = inject(FormBuilder);

  @Input({ required: true }) unit!: ToolUnit;
  @Input() presetEstado: EstadoUnidad | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  /** Emitido tras el cambio exitoso — el panel/tab refresca listas y KPIs. */
  @Output() readonly updated = new EventEmitter<ToolUnitStatusLogEntry>();

  readonly estados = ESTADOS_UNIDAD;
  readonly tiposMantenimiento = TIPOS_MANTENIMIENTO;

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly validationError = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    estado_nuevo: 'Operativo' as EstadoUnidad,
    tipo_mantenimiento: '' as TipoMantenimiento | '',
    falla_reportada: '',
    tecnico_asignado: '',
    costo_estimado: null as number | null,
    fecha_prevista_fin: '',
    motivo_baja: '',
  });

  ngOnInit(): void {
    // El valor inicial del select depende de `@Input() unit`/`presetEstado`,
    // que Angular recién setea después de construir la instancia — por eso
    // se resuelve acá y no en el inicializador del FormGroup de arriba.
    const inicial = this.presetEstado ?? this.unit?.estado ?? 'Operativo';
    this.form.patchValue({ estado_nuevo: inicial });
  }

  get lockEstado(): boolean {
    return this.presetEstado !== null;
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    this.validationError.set(null);
    this.submitError.set(null);

    const raw = this.form.getRawValue();
    const estadoNuevo = raw.estado_nuevo;
    const input: UpdateToolUnitStatusInput = { estado_nuevo: estadoNuevo };

    if (estadoNuevo === 'En Mantenimiento') {
      if (
        !raw.tipo_mantenimiento ||
        !raw.falla_reportada ||
        !raw.tecnico_asignado ||
        raw.costo_estimado === null ||
        !raw.fecha_prevista_fin
      ) {
        this.validationError.set(
          'Completa Tipo, Falla reportada, Técnico asignado, Costo estimado y Fecha prevista de fin.',
        );
        return;
      }
      input.tipo_mantenimiento = raw.tipo_mantenimiento;
      input.falla_reportada = raw.falla_reportada;
      input.tecnico_asignado = raw.tecnico_asignado;
      input.costo_estimado = raw.costo_estimado;
      input.fecha_prevista_fin = raw.fecha_prevista_fin;
    } else if (estadoNuevo === 'Dado de Baja') {
      if (!raw.motivo_baja) {
        this.validationError.set('Indica el motivo de la baja.');
        return;
      }
      input.motivo_baja = raw.motivo_baja;
    }

    this.submitting.set(true);

    this.inventory.updateUnitStatus(this.unit.id, input).subscribe({
      next: (entry) => {
        this.submitting.set(false);
        this.updated.emit(entry);
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(
          err?.error?.message ?? 'No pudimos actualizar el estado. Intenta de nuevo.',
        );
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
