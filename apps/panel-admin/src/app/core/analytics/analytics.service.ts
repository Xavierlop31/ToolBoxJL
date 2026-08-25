import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RevenueBreakdown } from '../models/analytics.models';

/**
 * Consume `GET /analytics/revenue` (HU-7.1, Issue #19 —
 * features/07_kpis_analitica.feature @HU-7.1: "Gerente consulta ingresos
 * totales desglosados"), openapi.yaml líneas 656-680. Requiere rol
 * gerente/admin (`x-roles`).
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
}
