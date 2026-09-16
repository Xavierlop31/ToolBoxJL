import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PaginatedUnitSearchBase } from '../../core/inventory/paginated-unit-search.base';
import { MetricCardComponent } from '../../shared/components/metric-card.component';
import { PaginationNavComponent } from '../../shared/components/pagination-nav.component';
import { UnitSearchInputComponent } from '../../shared/components/unit-search-input.component';
import { WidgetCardComponent } from '../../shared/components/widget-card.component';
import {
  AuditFeedEntry,
  EstadoVisualizacion,
  InventoryMetrics,
  WarehouseOccupancy,
} from '../../core/models/inventory.models';

const ESTADO_BADGE_CLASS: Record<EstadoVisualizacion, string> = {
  Operativo: 'badge-operativo',
  'En Alquiler': 'badge-en-alquiler',
  'En Mantenimiento': 'badge-en-mantenimiento',
  'Dado de Baja': 'badge-dado-de-baja',
};

/**
 * Dashboard "Almacén" (pedido directo del Arquitecto, 2026-09-14) — mockup
 * "Centro de Control de Inventario & QR". Vivía inicialmente en
 * `apps/panel-admin` (`/admin/almacen`), pero ese rol no le llega al
 * Almacenista (guard `/admin` de `apps/shell`) — se movió acá, como una
 * pestaña más del nav operativo (`logistica-shell.component.ts`), junto a
 * Escanear QR / Unidades / Registrar Unidad / Mi Ruta de Hoy.
 *
 * Reusa las páginas YA existentes de este mismo remote para las acciones de
 * cada tarjeta en vez de reimplementar modales: "Ver Hoja de Vida" y
 * "Cambiar Estado" van las dos a `/logistica/unidades/:id`
 * (`UnitDetailComponent` ya tiene ambas cosas en una sola pantalla — hoja de
 * vida completa + formulario de cambio de estado), y "+ Registrar Unidad"
 * a `/logistica/registrar-unidad`.
 *
 * Sin cámara embebida en el widget de búsqueda ("Lector Instantáneo" del
 * mockup): el escaneo QR real de este remote ya vive en su propia pestaña
 * (`/logistica/escanear`, `QrScannerComponent`) — acá el buscador es texto
 * libre (mismo criterio que `UnitListComponent`).
 *
 * La búsqueda/paginación de unidades reusa `PaginatedUnitSearchBase`
 * (compartida con `UnitListComponent`) — acá solo se agregan los 3 widgets
 * nuevos (métricas, ocupación, auditoría).
 */
@Component({
  selector: 'app-almacen-dashboard',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    UnitSearchInputComponent,
    PaginationNavComponent,
    MetricCardComponent,
    WidgetCardComponent,
  ],
  templateUrl: './almacen-dashboard.component.html',
  styleUrl: './almacen-dashboard.component.scss',
})
export class AlmacenDashboardComponent extends PaginatedUnitSearchBase {
  readonly loadingMetrics = signal(true);
  readonly metrics = signal<InventoryMetrics | null>(null);

  readonly loadingOccupancy = signal(true);
  readonly occupancy = signal<WarehouseOccupancy[]>([]);

  readonly loadingAuditFeed = signal(true);
  readonly auditFeed = signal<AuditFeedEntry[]>([]);

  override ngOnInit(): void {
    this.loadMetrics();
    this.loadOccupancy();
    this.loadAuditFeed();
    super.ngOnInit();
  }

  loadMetrics(): void {
    this.loadingMetrics.set(true);
    this.inventory.getMetrics().subscribe({
      next: (metrics) => {
        this.metrics.set(metrics);
        this.loadingMetrics.set(false);
      },
      error: () => this.loadingMetrics.set(false),
    });
  }

  loadOccupancy(): void {
    this.loadingOccupancy.set(true);
    this.inventory.getOccupancy().subscribe({
      next: (occupancy) => {
        this.occupancy.set(occupancy);
        this.loadingOccupancy.set(false);
      },
      error: () => this.loadingOccupancy.set(false),
    });
  }

  loadAuditFeed(): void {
    this.loadingAuditFeed.set(true);
    this.inventory.getAuditFeed().subscribe({
      next: (feed) => {
        this.auditFeed.set(feed);
        this.loadingAuditFeed.set(false);
      },
      error: () => this.loadingAuditFeed.set(false),
    });
  }

  estadoBadgeClass(estado: EstadoVisualizacion): string {
    return ESTADO_BADGE_CLASS[estado];
  }
}
