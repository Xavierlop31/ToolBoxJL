import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { InspectionService } from '../../core/inspections/inspection.service';
import { OfflineQueueService } from '../../core/offline/offline-queue.service';
import { OfflineSyncService } from '../../core/offline/offline-sync.service';
import {
  InspectionChecklist,
  InspectionChecklistInput,
  SEVERIDADES_HALLAZGO,
  SeveridadHallazgo,
} from '../../core/models/inspection.models';

type HallazgoForm = FormGroup<{
  descripcion: FormControl<string>;
  severidad: FormControl<SeveridadHallazgo>;
}>;

type ChecklistBody = Omit<InspectionChecklistInput, 'unidad_id'>;

/**
 * Checklist de inspección al recibir una devolución (RF-4.2, HU-5.1) —
 * features/05_devoluciones_inspeccion_mora.feature, escenario @RF-4.2.
 *
 * Alcance de este sprint (decisión del Tech Lead): SOLO `tipo: "recepcion"`
 * — es lo único que pide el escenario Gherkin ("recibiendo una herramienta
 * devuelta"). `tipo: "salida"` (inspección de despacho) queda fuera de
 * alcance, no hay escenario que lo pida, así que no se arma un selector de
 * `tipo` en la UI: se hardcodea `'recepcion'` en el body.
 *
 * `shipment_id` se ingresa a mano (input de texto): `openapi.yaml` no
 * declara ningún endpoint para "buscar el shipment de esta unidad", así que
 * el Almacenista/Repartidor lo escribe. Simplificación conocida de este
 * sprint, pendiente de una futura pantalla de "mis rutas asignadas" que lo
 * autocomplete.
 *
 * `unidad_id` sale del route param `:unidadId` (mismo patrón que `:id` en
 * `UnitDetailComponent`).
 *
 * Fotos: mismo criterio documentado en `UnitDetailComponent` —
 * `openapi.yaml` espera `fotos_urls: string[]` (URIs ya subidas), no
 * archivos binarios, y no hay endpoint de subida en el alcance de este
 * sprint. Usamos `URL.createObjectURL(file)` como placeholder documentado.
 *
 * Offline-first: mismo patrón que `UnitDetailComponent`
 * (`OfflineQueueService`/`OfflineSyncService`), reusados tal cual — el ítem
 * encolado se distingue con `kind: 'inspection-checklist'` (ver
 * `offline-queue.service.ts`, extensión aditiva de Sprint 5).
 */
@Component({
  selector: 'app-inspection-checklist',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './inspection-checklist.component.html',
  styleUrl: './inspection-checklist.component.scss',
})
export class InspectionChecklistComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly inspections = inject(InspectionService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly offlineSync = inject(OfflineSyncService);
  private readonly formBuilder = inject(FormBuilder);

  readonly severidades = SEVERIDADES_HALLAZGO;

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly queuedOffline = signal(false);
  readonly result = signal<InspectionChecklist | null>(null);
  readonly selectedPhotoCount = signal(0);

  private photoUrls: string[] = [];
  unidadId = '';

  readonly form = this.formBuilder.nonNullable.group({
    shipmentId: ['', Validators.required],
    hallazgos: this.formBuilder.array<HallazgoForm>([]),
  });

  get hallazgos() {
    return this.form.controls.hallazgos;
  }

  ngOnInit(): void {
    this.unidadId = this.route.snapshot.paramMap.get('unidadId') ?? '';
    if (!this.unidadId) {
      this.submitError.set('Unidad no encontrada en la ruta.');
    }
  }

  addHallazgo(): void {
    this.hallazgos.push(
      this.formBuilder.nonNullable.group({
        descripcion: ['', Validators.required],
        severidad: this.formBuilder.nonNullable.control<SeveridadHallazgo>(
          'leve',
          Validators.required,
        ),
      }),
    );
  }

  removeHallazgo(index: number): void {
    this.hallazgos.removeAt(index);
  }

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.photoUrls = files.map((file) => URL.createObjectURL(file));
    this.selectedPhotoCount.set(files.length);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting() || !this.unidadId) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    this.queuedOffline.set(false);
    this.result.set(null);

    const raw = this.form.getRawValue();
    const body: ChecklistBody = {
      shipment_id: raw.shipmentId,
      tipo: 'recepcion',
      ...(raw.hallazgos.length > 0 ? { hallazgos: raw.hallazgos } : {}),
      ...(this.photoUrls.length > 0 ? { fotos_urls: this.photoUrls } : {}),
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await this.enqueueOffline(body);
      return;
    }

    this.inspections.submitChecklist(this.unidadId, body).subscribe({
      next: (checklist) => {
        this.result.set(checklist);
        this.submitting.set(false);
      },
      error: async () => {
        // Fallo de red real (no solo `navigator.onLine === false`): se
        // encola igual para no perder el checklist.
        await this.enqueueOffline(body);
      },
    });
  }

  private async enqueueOffline(body: ChecklistBody): Promise<void> {
    await this.offlineQueue.enqueue({
      kind: 'inspection-checklist',
      unidadId: this.unidadId,
      body,
      queuedAt: new Date().toISOString(),
    });
    await this.offlineSync.refreshPendingCount();
    this.queuedOffline.set(true);
    this.submitting.set(false);
  }
}
