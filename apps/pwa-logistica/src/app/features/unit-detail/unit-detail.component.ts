import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { InventoryService } from '../../core/inventory/inventory.service';
import { OfflineQueueService } from '../../core/offline/offline-queue.service';
import { OfflineSyncService } from '../../core/offline/offline-sync.service';
import {
  ESTADOS_UNIDAD,
  EstadoUnidad,
  ToolUnit,
  ToolUnitStatusLogEntry,
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

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly unit = signal<ToolUnit | null>(null);

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly lastLogEntry = signal<ToolUnitStatusLogEntry | null>(null);
  readonly queuedOffline = signal(false);
  readonly selectedPhotoCount = signal(0);

  private photoUrls: string[] = [];
  private unitId = '';

  readonly form = this.formBuilder.nonNullable.group({
    estadoNuevo: ['Operativo' as EstadoUnidad, Validators.required],
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

    this.submitting.set(true);
    this.submitError.set(null);
    this.queuedOffline.set(false);

    const body = {
      estado_nuevo: this.form.getRawValue().estadoNuevo,
      ...(this.photoUrls.length > 0 ? { fotos_urls: this.photoUrls } : {}),
    };

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

  private async enqueueOffline(body: {
    estado_nuevo: EstadoUnidad;
    fotos_urls?: string[];
  }): Promise<void> {
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
