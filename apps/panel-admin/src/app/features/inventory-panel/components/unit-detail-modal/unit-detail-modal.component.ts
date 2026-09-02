import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';

import { InventoryService } from '../../../../core/inventory/inventory.service';
import { ToolUnit } from '../../../../core/models/inventory.models';

export type UnitDetailModalMode = 'qr' | 'historial';

/**
 * Modal compartido de "Ver QR" y "Historial" (HU-13.1, Issue #147, botones
 * de acción de la tabla de "Inventario General"). Ambos modos llaman a
 * `GET /inventory/units/{id}` (openapi.yaml líneas 487-504) porque el
 * listado de `GET /inventory/units` no trae `qr_code_url` por fila.
 *
 * AMBIGÜEDAD DE CONTRATO (reportada al Tech Lead, no resuelta por
 * adivinanza): openapi.yaml describe ese GET como devolviendo "la hoja de
 * vida resumida" de la unidad, pero el schema `ToolUnit` no incluye ningún
 * array de eventos — no existe en el contrato un endpoint que devuelva la
 * lista completa de `ToolUnitStatusLogEntry` de una unidad (el único lugar
 * donde aparece una entrada de hoja de vida es
 * `ultimo_evento_mantenimiento` de `GET /inventory/maintenance`, y solo
 * para unidades actualmente en mantenimiento/baja). El modo "historial" de
 * este componente muestra por eso el estado y los datos actuales de la
 * unidad (estado, fechas, ubicación, costo) en vez de un log cronológico de
 * cambios — es la mejor aproximación posible sin inventar un endpoint.
 */
@Component({
  selector: 'app-unit-detail-modal',
  standalone: true,
  imports: [DecimalPipe],
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

  ngOnInit(): void {
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

  close(): void {
    this.closed.emit();
  }
}
