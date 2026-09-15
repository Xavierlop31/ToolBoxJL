import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PaginatedUnitSearchBase } from '../../core/inventory/paginated-unit-search.base';

/**
 * HU-13.1 reducido (Issue #147 — trabajo adicional del mismo sprint): lista
 * y búsqueda simple de unidades físicas para el rol almacenista, SIN las 4
 * tarjetas de KPIs ni el filtro por estado del panel completo de
 * `apps/panel-admin` (`InventoryPanelComponent`) — alcance confirmado por el
 * Tech Lead. Cada fila navega a `unidades/:id`
 * (`UnitDetailComponent`, ya existente en este remote).
 *
 * La lógica de búsqueda/paginación vive en `PaginatedUnitSearchBase`
 * (compartida con `AlmacenDashboardComponent`, dashboard "Almacén",
 * 2026-09-14) — ver ese archivo para el detalle de `GET /inventory/units`.
 */
@Component({
  selector: 'app-unit-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './unit-list.component.html',
  styleUrl: './unit-list.component.scss',
})
export class UnitListComponent extends PaginatedUnitSearchBase {}
