import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';

import { InventoryService } from '../../../../core/inventory/inventory.service';
import { EstadoUnidad, MaintenanceUnit, ToolUnit } from '../../../../core/models/inventory.models';
import { StatusChangeModalComponent } from '../status-change-modal/status-change-modal.component';

/**
 * Pestaña "Mantenimiento & Taller" (HU-13.3, Issue #149) —
 * features/13_gestion_inventario_qr.feature: "Visualización de la pestaña
 * de mantenimiento" y "Retorno a estado operativo o baja definitiva".
 *
 * `GET /inventory/maintenance` (openapi.yaml líneas 459-485) devuelve las
 * unidades `En Mantenimiento`/`Dado de Baja` con su último evento de la
 * hoja de vida. Las acciones "Reintegrar a Servicio" (→ Operativo) y
 * "Declarar Baja Definitiva" (→ Dado de Baja) solo aplican a unidades
 * actualmente en taller (`En Mantenimiento`) — las ya dadas de baja son un
 * estado terminal en este contrato.
 */
@Component({
  selector: 'app-maintenance-tab',
  standalone: true,
  imports: [StatusChangeModalComponent],
  templateUrl: './maintenance-tab.component.html',
  styleUrl: './maintenance-tab.component.scss',
})
export class MaintenanceTabComponent implements OnInit {
  private readonly inventory = inject(InventoryService);

  /** El panel contenedor refresca las tarjetas de KPIs tras un cambio de estado. */
  @Output() readonly dataChanged = new EventEmitter<void>();

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly units = signal<MaintenanceUnit[]>([]);

  readonly statusChangeTarget = signal<{ unit: ToolUnit; presetEstado: EstadoUnidad } | null>(
    null,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.inventory.listMaintenance().subscribe({
      next: (units) => {
        this.units.set(units);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar las unidades en mantenimiento.');
        this.loading.set(false);
      },
    });
  }

  reintegrar(unit: MaintenanceUnit): void {
    this.statusChangeTarget.set({ unit, presetEstado: 'Operativo' });
  }

  declararBaja(unit: MaintenanceUnit): void {
    this.statusChangeTarget.set({ unit, presetEstado: 'Dado de Baja' });
  }

  onStatusUpdated(): void {
    this.statusChangeTarget.set(null);
    this.load();
    this.dataChanged.emit();
  }
}
