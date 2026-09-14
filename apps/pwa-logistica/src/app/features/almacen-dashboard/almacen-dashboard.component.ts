import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { InventoryService } from '../../core/inventory/inventory.service';
import {
  AuditFeedEntry,
  EstadoVisualizacion,
  InventoryMetrics,
  ToolUnitListItem,
  WarehouseOccupancy,
} from '../../core/models/inventory.models';

const PAGE_SIZE = 20;

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
 */
@Component({
  selector: 'app-almacen-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './almacen-dashboard.component.html',
  styleUrl: './almacen-dashboard.component.scss',
})
export class AlmacenDashboardComponent implements OnInit, OnDestroy {
  private readonly inventory = inject(InventoryService);
  private readonly destroy$ = new Subject<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly loadingMetrics = signal(true);
  readonly metrics = signal<InventoryMetrics | null>(null);

  readonly loadingOccupancy = signal(true);
  readonly occupancy = signal<WarehouseOccupancy[]>([]);

  readonly loadingAuditFeed = signal(true);
  readonly auditFeed = signal<AuditFeedEntry[]>([]);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly items = signal<ToolUnitListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;

  ngOnInit(): void {
    this.loadMetrics();
    this.loadOccupancy();
    this.loadAuditFeed();
    this.load();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.inventory
      .listUnits({ q: this.searchControl.value || undefined, page: this.page(), pageSize: this.pageSize })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No pudimos cargar el inventario de unidades.');
          this.loading.set(false);
        },
      });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.page.set(page);
    this.load();
  }

  estadoBadgeClass(estado: EstadoVisualizacion): string {
    return ESTADO_BADGE_CLASS[estado];
  }
}
