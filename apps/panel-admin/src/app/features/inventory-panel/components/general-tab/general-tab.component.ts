import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { InventoryService } from '../../../../core/inventory/inventory.service';
import {
  ESTADOS_VISUALIZACION,
  EstadoVisualizacion,
  InventoryMetrics,
  ToolUnitListItem,
  estadoVisualizacionBadgeClass,
} from '../../../../core/models/inventory.models';
import { RegisterUnitModalComponent } from '../register-unit-modal/register-unit-modal.component';
import { StatusChangeModalComponent } from '../status-change-modal/status-change-modal.component';
import { UnitDetailPanelComponent } from '../unit-detail-panel/unit-detail-panel.component';

const PAGE_SIZE = 20;

/**
 * Página "Almacén" (`/admin/almacen`, antes pestaña "Inventario General"
 * de `/admin/inventario`) — HU-13.1, HU-13.2, HU-13.3 (Issues #147, #148,
 * #149) — features/13_gestion_inventario_qr.feature: "Visualización de
 * tarjetas de métricas de inventario", "Filtros y búsqueda en tabla de
 * unidades físicas", "Apertura del formulario de registro desde el panel"
 * y "Registro exitoso y generación de QR imprimible".
 *
 * Issue #184 (fidelidad visual contra el mockup Stitch "Gestión Inventario
 * - Rediseño Admin"): esta página ahora se monta DIRECTAMENTE en la ruta
 * (ya no hay un `InventoryPanelComponent` contenedor con pestañas ni
 * tarjetas de KPIs por separado) — las 4 tarjetas de métricas de HU-13.1
 * viven acá arriba de la tabla, porque es la vista de inventario general
 * donde tienen más sentido (el nuevo Dashboard consolidado de HU-15.1 no
 * las duplica, son métricas de ALCANCE distinto). El panel de detalle
 * (`UnitDetailPanelComponent`) es ahora un panel DOCKED permanente al
 * costado de la tabla, no un modal — fusiona los 2 modos viejos ("Ver QR"
 * / "Historial") en una sola vista que se actualiza al seleccionar una
 * fila.
 *
 * `GET /inventory/units` (openapi.yaml líneas 339-434) con `q`/`estado`/
 * `page`/`pageSize`, búsqueda con debounce de 300ms para el filtrado
 * "instantáneo" que pide el escenario Gherkin sin martillar la API en cada
 * tecla.
 */
@Component({
  selector: 'app-general-tab',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RegisterUnitModalComponent,
    StatusChangeModalComponent,
    UnitDetailPanelComponent,
  ],
  templateUrl: './general-tab.component.html',
  styleUrl: './general-tab.component.scss',
})
export class GeneralTabComponent implements OnInit, OnDestroy {
  private readonly inventory = inject(InventoryService);
  private readonly destroy$ = new Subject<void>();

  readonly estados = ESTADOS_VISUALIZACION;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly estadoControl = new FormControl<EstadoVisualizacion | ''>('', { nonNullable: true });

  readonly loadingMetrics = signal(true);
  readonly metrics = signal<InventoryMetrics | null>(null);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly items = signal<ToolUnitListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;

  readonly showRegisterModal = signal(false);

  /** Fila seleccionada de la tabla — pilotea el panel docked de detalle. */
  readonly selectedUnit = signal<ToolUnitListItem | null>(null);
  readonly statusChangeUnit = signal<ToolUnitListItem | null>(null);

  ngOnInit(): void {
    this.loadMetrics();
    this.load();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });

    this.estadoControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
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
      error: () => {
        this.loadingMetrics.set(false);
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.inventory
      .listUnits({
        q: this.searchControl.value || undefined,
        estado: this.estadoControl.value || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
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
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.page.set(page);
    this.load();
  }

  openRegisterModal(): void {
    this.showRegisterModal.set(true);
  }

  onUnitRegistered(): void {
    // El modal NO se cierra acá: `RegisterUnitModalComponent` sigue montado
    // mostrando su propia vista previa imprimible del QR (HU-13.2) hasta
    // que el usuario haga clic en "Cerrar"/"Imprimir" (evento `closed`,
    // ver el binding en el template). Cerrarlo acá lo desmontaría del DOM
    // en el mismo ciclo de detección de cambios, antes de que la vista
    // previa llegue a pintarse — bug real encontrado vía BDD (HU-13.2,
    // escenario "Registro exitoso y generación de QR imprimible").
    this.page.set(1);
    this.load();
    this.loadMetrics();
  }

  /** Selecciona una fila — pilotea el panel docked de detalle (reemplaza a los viejos "Ver QR"/"Historial" con modal). */
  selectUnit(unit: ToolUnitListItem): void {
    this.selectedUnit.set(unit);
  }

  cambiarEstado(unit: ToolUnitListItem): void {
    this.statusChangeUnit.set(unit);
  }

  onStatusUpdated(): void {
    this.statusChangeUnit.set(null);
    this.load();
    this.loadMetrics();
  }

  estadoBadgeClass(estado: EstadoVisualizacion): string {
    return estadoVisualizacionBadgeClass(estado);
  }
}
