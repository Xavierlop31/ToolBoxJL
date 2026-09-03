import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  DashboardKpis,
  DeliveryProductivity,
  RevenueBreakdown,
  RoiItem,
  UtilizationSummary,
} from '../models/analytics.models';

/**
 * Consume los endpoints de `/analytics/*` (Épica 7 — KPIs y analítica),
 * openapi.yaml líneas 850-950. Todos requieren rol gerente/admin
 * (`x-roles`):
 * - `getRevenue`: HU-7.1, Issue #19 — features/07_kpis_analitica.feature
 *   @HU-7.1: "Gerente consulta ingresos totales desglosados".
 * - `getRoi`: HU-7.2, Issue #20 — escenario "Gerente consulta el ROI por
 *   herramienta".
 * - `getUtilization` / `getDeliveryProductivity`: HU-7.3, Issue #21 —
 *   escenario "Gerente consulta utilización de inventario y productividad
 *   de repartidores".
 * - `getDashboardKpis`: HU-15.1, Sprint 15, Issue #153 —
 *   features/15_dashboard_kpis_gerencial.feature. Panel ejecutivo único que
 *   consolida los 4 KPIs macrofinancieros + Alertas Críticas en una sola
 *   llamada (openapi.yaml líneas 1351-1376), en vez de componer
 *   `getRevenue`/`getRoi`/`getUtilization`.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getRevenue(periodo: string): Observable<RevenueBreakdown> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http.get<RevenueBreakdown>(`${this.baseUrl}/analytics/revenue`, {
      params,
    });
  }

  /**
   * `modelo_id` es opcional en el contrato (openapi.yaml línea 884): sin
   * él, el backend devuelve el ROI de todos los modelos.
   */
  getRoi(modeloId?: string): Observable<RoiItem[]> {
    let params = new HttpParams();
    if (modeloId) {
      params = params.set('modelo_id', modeloId);
    }
    return this.http.get<RoiItem[]>(`${this.baseUrl}/analytics/roi`, { params });
  }

  getUtilization(): Observable<UtilizationSummary> {
    return this.http.get<UtilizationSummary>(`${this.baseUrl}/analytics/utilization`);
  }

  getDeliveryProductivity(): Observable<DeliveryProductivity[]> {
    return this.http.get<DeliveryProductivity[]>(
      `${this.baseUrl}/analytics/delivery-productivity`,
    );
  }

  getDashboardKpis(): Observable<DashboardKpis> {
    return this.http.get<DashboardKpis>(`${this.baseUrl}/analytics/dashboard-kpis`);
  }
}
