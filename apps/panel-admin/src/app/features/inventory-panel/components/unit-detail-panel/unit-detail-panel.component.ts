import { DatePipe } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { InventoryService } from '../../../../core/inventory/inventory.service';
import {
  ToolUnit,
  ToolUnitListItem,
  ToolUnitStatusLogEntry,
  estadoVisualizacionBadgeClass,
} from '../../../../core/models/inventory.models';

/**
 * Panel de detalle DOCKED de "Almacén" (Issue #184, fidelidad visual contra
 * el mockup Stitch "Gestión Inventario - Rediseño Admin") — reemplaza a
 * `UnitDetailModalComponent` (`mode: 'qr' | 'historial'` como dos overlays
 * separados). Este panel es permanente al costado de la tabla, sin
 * backdrop ni botón de cerrar: se actualiza cuando `GeneralTabComponent`
 * cambia el `@Input() unit` al seleccionar otra fila.
 *
 * Reusa las mismas 2 llamadas que hacía el modal viejo —
 * `GET /inventory/units/{id}` (ficha canónica, incluida `qr_code_url`) y
 * `GET /inventory/units/{id}/history` (hoja de vida completa,
 * `ToolUnitStatusLogEntry[]`) — pero ahora en paralelo con `forkJoin`
 * porque el panel muestra TODO junto (QR + metadata + timeline), no un modo
 * a la vez.
 *
 * `modelo_nombre`/`modelo_categoria`/`estado_visualizacion` NO están en el
 * schema `ToolUnit` de `GET /inventory/units/{id}` (openapi.yaml líneas
 * 487-509) — solo en la fila expandida de `GET /inventory/units`
 * (líneas 409-434) — por eso se reciben directamente del `@Input() unit`
 * (la fila ya seleccionada en la tabla) en vez de pedirlos de nuevo acá.
 * El mockup pide "Marca" en el grid de metadata; el contrato no expone
 * marca a nivel de unidad (solo en `ToolModelOption` del selector de alta),
 * así que se muestra "Categoría" en su lugar — decisión de implementación,
 * no de alcance.
 */
@Component({
  selector: 'app-unit-detail-panel',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './unit-detail-panel.component.html',
  styleUrl: './unit-detail-panel.component.scss',
})
export class UnitDetailPanelComponent implements OnChanges {
  private readonly inventory = inject(InventoryService);

  @Input() unit: ToolUnitListItem | null = null;

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly detail = signal<ToolUnit | null>(null);
  readonly history = signal<ToolUnitStatusLogEntry[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['unit']) {
      return;
    }

    const current = this.unit;
    if (!current) {
      this.detail.set(null);
      this.history.set([]);
      this.errorMessage.set(null);
      this.loading.set(false);
      return;
    }

    this.load(current.id);
  }

  private load(unitId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.detail.set(null);
    this.history.set([]);

    forkJoin({
      unit: this.inventory.getUnitById(unitId).pipe(catchError(() => of(null))),
      history: this.inventory.getUnitHistory(unitId).pipe(catchError(() => of(null))),
    }).subscribe(({ unit, history }) => {
      this.loading.set(false);

      if (unit) {
        this.detail.set(unit);
      }
      if (history) {
        this.history.set(history);
      }
      if (!unit || !history) {
        this.errorMessage.set('No pudimos cargar el detalle completo de esta unidad.');
      }
    });
  }

  estadoBadgeClass(): string {
    return this.unit ? estadoVisualizacionBadgeClass(this.unit.estado_visualizacion) : '';
  }
}
