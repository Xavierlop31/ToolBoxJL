import { Component, OnInit, inject, signal } from '@angular/core';

import { InventoryService } from '../../core/inventory/inventory.service';
import { InventoryMetrics } from '../../core/models/inventory.models';
import { GeneralTabComponent } from './components/general-tab/general-tab.component';
import { MaintenanceTabComponent } from './components/maintenance-tab/maintenance-tab.component';
import { RoutesTodayTabComponent } from './components/routes-today-tab/routes-today-tab.component';

type InventoryTab = 'general' | 'mantenimiento' | 'rutas';

/**
 * Panel principal de Gestión de Inventario QR (Sprint 14, Fase 3,
 * Épica 13 — Issues #147-#150, HU-13.1 a HU-13.4), montado en
 * `/admin/inventario` — features/13_gestion_inventario_qr.feature:
 * "Visualización de tarjetas de métricas de inventario".
 *
 * Las 3 pestañas de HU-13.1 ("Inventario General"), HU-13.3 ("Mantenimiento
 * & Taller") y HU-13.4 ("Rutas del Día") conviven en esta misma pantalla —
 * no son rutas separadas — por eso el cambio de pestaña es un signal local,
 * no un `routerLink`. Cada pestaña se instancia con `@if` (no solo se
 * oculta con CSS) para que dispare su propia carga de datos al volver a
 * activarse.
 */
@Component({
  selector: 'app-inventory-panel',
  standalone: true,
  imports: [GeneralTabComponent, MaintenanceTabComponent, RoutesTodayTabComponent],
  templateUrl: './inventory-panel.component.html',
  styleUrl: './inventory-panel.component.scss',
})
export class InventoryPanelComponent implements OnInit {
  private readonly inventory = inject(InventoryService);

  readonly activeTab = signal<InventoryTab>('general');

  readonly loadingMetrics = signal(true);
  readonly metrics = signal<InventoryMetrics | null>(null);

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.loadingMetrics.set(true);
    this.inventory.getMetrics().subscribe({
      next: (metrics) => {
        this.metrics.set(metrics);
        this.loadingMetrics.set(false);
      },
      error: () => {
        this.loadingMetrics.set(false);
      },
    });
  }

  setTab(tab: InventoryTab): void {
    this.activeTab.set(tab);
  }
}
