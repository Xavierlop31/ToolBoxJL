import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuditFeedEntry,
  CreateUnitInput,
  InventoryMetrics,
  ListToolUnitsParams,
  ListToolUnitsResult,
  ToolModelOption,
  ToolUnit,
  ToolUnitStatusLogEntry,
  UpdateUnitStatusInput,
  WarehouseOccupancy,
} from '../models/inventory.models';

/**
 * Consume `GET /inventory/units/{id}` (RF-1.2 — ficha al escanear el QR) y
 * `PATCH /inventory/units/{id}/status` (RF-1.3 — cambio de estado + hoja de
 * vida), openapi.yaml líneas 159-210. Ambos requieren rol
 * almacenista/repartidor.
 *
 * Sprint 14 (Fase 3, Épica 13, Issues #147/#148) agrega `createUnit`
 * (`POST /inventory/units`, HU-13.2) y `listUnits`
 * (`GET /inventory/units`, HU-13.1 reducido) y `listModelOptions`
 * (`GET /catalog/search`, público) para el selector de modelo del alta de
 * unidad. `x-roles` de `/inventory/units` (ambos verbos) es
 * `[almacenista, admin]`.
 *
 * `getMetrics`/`getOccupancy`/`getAuditFeed` (pedido del Arquitecto,
 * 2026-09-14): el dashboard "Almacén" con KPIs + widgets, antes SOLO en
 * `apps/panel-admin` (`/admin/almacen`, rol al que el Almacenista no tiene
 * acceso — ver `logistica-shell.component.ts`), pasa a vivir también acá.
 * Mismos 3 endpoints que ya consume `panel-admin`, mismo `x-roles`
 * `[almacenista, admin]` — no hizo falta abrir ningún permiso nuevo.
 */
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getUnitById(id: string): Observable<ToolUnit> {
    return this.http.get<ToolUnit>(`${this.baseUrl}/inventory/units/${id}`);
  }

  updateUnitStatus(
    id: string,
    body: UpdateUnitStatusInput,
  ): Observable<ToolUnitStatusLogEntry> {
    return this.http.patch<ToolUnitStatusLogEntry>(
      `${this.baseUrl}/inventory/units/${id}/status`,
      body,
    );
  }

  /** `POST /inventory/units` (HU-13.2) — alta de unidad física + QR. */
  createUnit(input: CreateUnitInput): Observable<ToolUnit> {
    return this.http.post<ToolUnit>(`${this.baseUrl}/inventory/units`, input);
  }

  /**
   * `GET /inventory/units` (HU-13.1 reducido) — búsqueda simple por `q`
   * (código QR, serial o nombre de modelo) con paginación, sin filtro de
   * estado ni KPIs (esos quedan solo en `apps/panel-admin`).
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
   * `GET /catalog/search` — reutilizado como selector de "Modelo" del
   * formulario de alta de unidad (HU-13.2). Endpoint público, sin paginar
   * cuando no se envían `page`/`pageSize` (openapi.yaml líneas 224-256).
   */
  listModelOptions(): Observable<ToolModelOption[]> {
    return this.http.get<ToolModelOption[]>(`${this.baseUrl}/catalog/search`);
  }

  /** `GET /inventory/metrics` — las 4 tarjetas de KPIs del dashboard "Almacén". */
  getMetrics(): Observable<InventoryMetrics> {
    return this.http.get<InventoryMetrics>(`${this.baseUrl}/inventory/metrics`);
  }

  /** `GET /inventory/occupancy` — widget "Ocupación de Almacén". */
  getOccupancy(): Observable<WarehouseOccupancy[]> {
    return this.http.get<WarehouseOccupancy[]>(`${this.baseUrl}/inventory/occupancy`);
  }

  /** `GET /inventory/audit-feed` — widget "Auditoría en Vivo". */
  getAuditFeed(limit?: number): Observable<AuditFeedEntry[]> {
    let httpParams = new HttpParams();
    if (limit) httpParams = httpParams.set('limit', limit);
    return this.http.get<AuditFeedEntry[]>(`${this.baseUrl}/inventory/audit-feed`, {
      params: httpParams,
    });
  }
}
