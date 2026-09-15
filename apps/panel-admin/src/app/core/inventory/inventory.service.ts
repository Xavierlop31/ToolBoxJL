import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateToolUnitInput,
  InventoryMetrics,
  ListToolUnitsParams,
  ListToolUnitsResult,
  MaintenanceUnit,
  ToolModelOption,
  ToolUnit,
  ToolUnitStatusLogEntry,
  UpdateToolUnitStatusInput,
} from '../models/inventory.models';

/**
 * Consume los endpoints de `/inventory/*` del panel de Gestión de
 * Inventario QR (Sprint 14, Fase 3, Épica 13 — Issues #147-#150,
 * HU-13.1 a HU-13.4), openapi.yaml líneas 339-558. Todos requieren rol
 * almacenista/admin (`x-roles: [almacenista, admin]`), salvo
 * `getToolUnitById` que además permite `repartidor`.
 */
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** `GET /inventory/metrics` (HU-13.1) — las 4 tarjetas de KPIs. */
  getMetrics(): Observable<InventoryMetrics> {
    return this.http.get<InventoryMetrics>(`${this.baseUrl}/inventory/metrics`);
  }

  /**
   * `GET /inventory/units` (HU-13.1) — tabla filtrable de "Inventario
   * General". `q` busca por código QR (UUID), Serial o nombre de Modelo;
   * `estado` filtra por el estado DE VISUALIZACIÓN.
   */
  listUnits(params: ListToolUnitsParams = {}): Observable<ListToolUnitsResult> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.estado) httpParams = httpParams.set('estado', params.estado);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);

    return this.http.get<ListToolUnitsResult>(`${this.baseUrl}/inventory/units`, {
      params: httpParams,
    });
  }

  /**
   * `GET /inventory/units/{id}` — ficha completa de una unidad, incluido su
   * `qr_code_url`. `GET /inventory/units` (listado) no trae ese campo por
   * fila, por eso "Ver QR" dispara esta llamada puntual. NO incluye la hoja
   * de vida completa — para eso, `getUnitHistory`.
   */
  getUnitById(id: string): Observable<ToolUnit> {
    return this.http.get<ToolUnit>(`${this.baseUrl}/inventory/units/${id}`);
  }

  /**
   * `GET /inventory/units/{id}/history` (HU-13.1, botón "Historial") —
   * hoja de vida completa de la unidad (`tool_unit_status_log`), orden
   * cronológico descendente (más reciente primero). Endpoint agregado en
   * Sprint 14 tras detectar que no existía ninguno para listar la hoja de
   * vida completa (openapi.yaml líneas 511-535).
   */
  getUnitHistory(id: string): Observable<ToolUnitStatusLogEntry[]> {
    return this.http.get<ToolUnitStatusLogEntry[]>(
      `${this.baseUrl}/inventory/units/${id}/history`,
    );
  }

  /** `POST /inventory/units` (HU-13.2) — alta de unidad física + QR. */
  createUnit(input: CreateToolUnitInput): Observable<ToolUnit> {
    return this.http.post<ToolUnit>(`${this.baseUrl}/inventory/units`, input);
  }

  /**
   * `PATCH /inventory/units/{id}/status` (HU-13.3) — cambio de estado +
   * registro en hoja de vida. Usado tanto por "Cambiar Estado" (pestaña
   * Inventario General) como por "Reintegrar a Servicio"/"Declarar Baja
   * Definitiva" (pestaña Mantenimiento & Taller).
   */
  updateUnitStatus(
    id: string,
    input: UpdateToolUnitStatusInput,
  ): Observable<ToolUnitStatusLogEntry> {
    return this.http.patch<ToolUnitStatusLogEntry>(
      `${this.baseUrl}/inventory/units/${id}/status`,
      input,
    );
  }

  /** `GET /inventory/maintenance` (HU-13.3) — pestaña "Mantenimiento & Taller". */
  listMaintenance(): Observable<MaintenanceUnit[]> {
    return this.http.get<MaintenanceUnit[]>(`${this.baseUrl}/inventory/maintenance`);
  }

  /**
   * `GET /catalog/search` — reutilizado acá como selector de "Modelo de
   * Herramienta" del formulario de alta de unidad (HU-13.2). Endpoint
   * público (`x-roles: [público]`), sin paginar cuando no se envían
   * `page`/`pageSize` (openapi.yaml líneas 224-256).
   */
  listModelOptions(): Observable<ToolModelOption[]> {
    return this.http.get<ToolModelOption[]>(`${this.baseUrl}/catalog/search`);
  }
}
