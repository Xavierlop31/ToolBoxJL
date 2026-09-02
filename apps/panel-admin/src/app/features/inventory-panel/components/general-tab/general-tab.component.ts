import { Component, EventEmitter, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { InventoryService } from '../../../../core/inventory/inventory.service';
import {
  ESTADOS_VISUALIZACION,
  EstadoVisualizacion,
  ToolUnit,
  ToolUnitListItem,
} from '../../../../core/models/inventory.models';
import { RegisterUnitModalComponent } from '../register-unit-modal/register-unit-modal.component';
import { StatusChangeModalComponent } from '../status-change-modal/status-change-modal.component';
import {
  UnitDetailModalComponent,
  UnitDetailModalMode,
} from '../unit-detail-modal/unit-detail-modal.component';

const PAGE_SIZE = 20;

/**
 * Pestaña "Inventario General" del panel de Gestión de Inventario QR
 * (HU-13.1, HU-13.2, HU-13.3 — Issues #147, #148, #149) —
 * features/13_gestion_inventario_qr.feature: "Filtros y búsqueda en tabla
 * de unidades físicas", "Apertura del formulario de registro desde el
 * panel" y "Registro exitoso y generación de QR imprimible".
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
    UnitDetailModalComponent,
  ],
  templateUrl: './general-tab.component.html',
  styleUrl: './general-tab.component.scss',
})
export class GeneralTabComponent implements OnInit, OnDestroy {
  private readonly inventory = inject(InventoryService);
  private readonly destroy$ = new Subject<void>();

  /** El panel contenedor refresca las tarjetas de KPIs tras un alta o un cambio de estado. */
  @Output() readonly dataChanged = new EventEmitter<void>();

  readonly estados = ESTADOS_VISUALIZACION;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly estadoControl = new FormControl<EstadoVisualizacion | ''>('', { nonNullable: true });

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly items = signal<ToolUnitListItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;

  readonly showRegisterModal = signal(false);

  readonly detailModal = signal<{ unitId: string; mode: UnitDetailModalMode } | null>(null);
  readonly statusChangeUnit = signal<ToolUnit | null>(null);

  ngOnInit(): void {
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
    this.dataChanged.emit();
  }

  verQr(unit: ToolUnitListItem): void {
    this.detailModal.set({ unitId: unit.id, mode: 'qr' });
  }

  verHistorial(unit: ToolUnitListItem): void {
    this.detailModal.set({ unitId: unit.id, mode: 'historial' });
  }

  cambiarEstado(unit: ToolUnitListItem): void {
    this.statusChangeUnit.set(unit);
  }

  onStatusUpdated(): void {
    this.statusChangeUnit.set(null);
    this.load();
    this.dataChanged.emit();
  }

  estadoBadgeClass(estado: EstadoVisualizacion): string {
    switch (estado) {
      case 'Operativo':
        return 'badge-operativo';
      case 'En Alquiler':
        return 'badge-en-alquiler';
      case 'En Mantenimiento':
        return 'badge-en-mantenimiento';
      case 'Dado de Baja':
        return 'badge-dado-de-baja';
    }
  }
}
