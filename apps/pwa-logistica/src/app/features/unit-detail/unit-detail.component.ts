import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { InventoryService } from '../../core/inventory/inventory.service';
import { OfflineQueueService } from '../../core/offline/offline-queue.service';
import { OfflineSyncService } from '../../core/offline/offline-sync.service';
import {
  ESTADOS_UNIDAD,
  EstadoUnidad,
  TIPOS_MANTENIMIENTO,
  TipoMantenimiento,
  ToolUnit,
  ToolUnitStatusLogEntry,
  UpdateUnitStatusInput,
} from '../../core/models/inventory.models';

/**
 * Ficha de unidad (RF-1.2, tras escanear el QR) + cambio de estado (RF-1.3)
 * con carga opcional de fotos — features/01_catalogo_inventario.feature.
 *
 * Fotos: `openapi.yaml` (`PATCH /inventory/units/{id}/status`) espera
 * `fotos_urls: string[]` (URIs ya subidas), no archivos binarios — el
 * contrato no incluye un endpoint de subida de fotos en el alcance de este
 * sprint (líneas 59-244). Como placeholder documentado, usamos
 * `URL.createObjectURL(file)` como "url" por archivo seleccionado; cuando
 * Backend defina un endpoint real de subida (Supabase Storage), se
 * reemplaza acá sin tocar el resto del flujo.
 *
 * Sprint 14 (Fase 3, Épica 13, Issue #148 — trabajo adicional del mismo
 * sprint, no cierra HU-13.3): cuando el estado destino es "En Mantenimiento"
 * o "Dado de Baja", exige los campos de taller/baja como obligatorios en la
 * UI (el backend, `PATCH /inventory/units/{id}/status`, solo exige
 * `estado_nuevo`) — mismo criterio de validación condicional que
 * `apps/panel-admin` (`StatusChangeModalComponent`, PR #169). La cola
 * offline (`OfflineQueueService`/`OfflineSyncService`) los soporta sin
 * cambios: `QueuedStatusChange.body` es `UpdateUnitStatusInput`, que ya
 * incluye estos campos, y viaja tal cual a `PATCH .../status` al reconectar.
 */
@Component({
  selector: 'app-unit-detail',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './unit-detail.component.html',
  styleUrl: './unit-detail.component.scss',
})
export class UnitDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly inventory = inject(InventoryService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly offlineSync = inject(OfflineSyncService);
  private readonly formBuilder = inject(FormBuilder);

  readonly estados = ESTADOS_UNIDAD;
  readonly tiposMantenimiento = TIPOS_MANTENIMIENTO;

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly unit = signal<ToolUnit | null>(null);

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly validationError = signal<string | null>(null);
  readonly lastLogEntry = signal<ToolUnitStatusLogEntry | null>(null);
  readonly queuedOffline = signal(false);
  readonly selectedPhotoCount = signal(0);

  private photoUrls: string[] = [];
  private unitId = '';

  readonly form = this.formBuilder.nonNullable.group({
    estadoNuevo: ['Operativo' as EstadoUnidad, Validators.required],
    tipoMantenimiento: '' as TipoMantenimiento | '',
    fallaReportada: '',
    tecnicoAsignado: '',
    costoEstimado: null as number | null,
    fechaPrevistaFin: '',
    motivoBaja: '',
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Unidad no encontrada.');
      this.loading.set(false);
      return;
    }
    this.unitId = id;

    this.inventory.getUnitById(id).subscribe({
      next: (unit) => {
        this.unit.set(unit);
        this.form.patchValue({ estadoNuevo: unit.estado });
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar la ficha de la unidad.');
        this.loading.set(false);
      },
    });
  }

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.photoUrls = files.map((file) => URL.createObjectURL(file));
    this.selectedPhotoCount.set(files.length);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.validationError.set(null);
    this.submitError.set(null);
    this.queuedOffline.set(false);

    const raw = this.form.getRawValue();
    const estadoNuevo = raw.estadoNuevo;
    const body: UpdateUnitStatusInput = { estado_nuevo: estadoNuevo };

    if (estadoNuevo === 'En Mantenimiento') {
      if (
        !raw.tipoMantenimiento ||
        !raw.fallaReportada ||
        !raw.tecnicoAsignado ||
        raw.costoEstimado === null ||
        !raw.fechaPrevistaFin
      ) {
        this.validationError.set(
          'Completa Tipo, Falla reportada, Técnico asignado, Costo estimado y Fecha prevista de fin.',
        );
        return;
      }
      body.tipo_mantenimiento = raw.tipoMantenimiento;
      body.falla_reportada = raw.fallaReportada;
      body.tecnico_asignado = raw.tecnicoAsignado;
      body.costo_estimado = raw.costoEstimado;
      body.fecha_prevista_fin = raw.fechaPrevistaFin;
    } else if (estadoNuevo === 'Dado de Baja') {
      if (!raw.motivoBaja) {
        this.validationError.set('Indica el motivo de la baja.');
        return;
      }
      body.motivo_baja = raw.motivoBaja;
    }

    if (this.photoUrls.length > 0) {
      body.fotos_urls = this.photoUrls;
    }

    this.submitting.set(true);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await this.enqueueOffline(body);
      return;
    }

    this.inventory.updateUnitStatus(this.unitId, body).subscribe({
      next: (entry) => {
        this.lastLogEntry.set(entry);
        this.unit.update((u) => (u ? { ...u, estado: entry.estado_nuevo } : u));
        this.submitting.set(false);
      },
      error: async () => {
        // Fallo de red real (no solo `navigator.onLine === false`): se
        // encola igual para no perder el cambio de estado.
        await this.enqueueOffline(body);
      },
    });
  }

  private async enqueueOffline(body: UpdateUnitStatusInput): Promise<void> {
    await this.offlineQueue.enqueue({
      unidadId: this.unitId,
      body,
      queuedAt: new Date().toISOString(),
    });
    await this.offlineSync.refreshPendingCount();
    this.queuedOffline.set(true);
    this.submitting.set(false);
  }
}
