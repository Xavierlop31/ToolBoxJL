import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';

import { InventoryService } from '../../../../core/inventory/inventory.service';
import { ToolUnit, ToolUnitStatusLogEntry } from '../../../../core/models/inventory.models';

export type UnitDetailModalMode = 'qr' | 'historial';

/**
 * Modal compartido de "Ver QR" y "Historial" (HU-13.1, Issue #147, botones
 * de acción de la tabla de "Inventario General").
 *
 * Modo `'qr'`: `GET /inventory/units/{id}` (openapi.yaml líneas 487-508)
 * porque el listado de `GET /inventory/units` no trae `qr_code_url` por
 * fila.
 *
 * Modo `'historial'`: `GET /inventory/units/{id}/history` (openapi.yaml
 * líneas 511-535) — endpoint agregado en Sprint 14 tras detectar que no
 * existía ninguno para listar la hoja de vida completa de una unidad
 * (`ToolUnitStatusLogEntry[]`, orden cronológico descendente); antes de
 * eso, este modo mostraba solo el estado/datos actuales de la unidad como
 * aproximación (gap ya cerrado, ver PR #170/#171).
 */
@Component({
  selector: 'app-unit-detail-modal',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './unit-detail-modal.component.html',
  styleUrl: './unit-detail-modal.component.scss',
})
export class UnitDetailModalComponent implements OnInit {
  private readonly inventory = inject(InventoryService);

  @Input({ required: true }) unitId!: string;
  @Input() mode: UnitDetailModalMode = 'qr';

  @Output() readonly closed = new EventEmitter<void>();

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly unit = signal<ToolUnit | null>(null);
  readonly history = signal<ToolUnitStatusLogEntry[]>([]);

  ngOnInit(): void {
    if (this.mode === 'historial') {
      this.loadHistory();
    } else {
      this.loadUnit();
    }
  }

  private loadUnit(): void {
    this.inventory.getUnitById(this.unitId).subscribe({
      next: (unit) => {
        this.unit.set(unit);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar la información de esta unidad.');
        this.loading.set(false);
      },
    });
  }

  private loadHistory(): void {
    this.inventory.getUnitHistory(this.unitId).subscribe({
      next: (history) => {
        this.history.set(history);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No pudimos cargar el historial de esta unidad.');
        this.loading.set(false);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
