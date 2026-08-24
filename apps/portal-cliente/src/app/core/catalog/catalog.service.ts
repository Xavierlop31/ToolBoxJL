import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AvailabilityResult, ToolModel } from '../models/catalog.models';

export interface CatalogSearchParams {
  q?: string;
  categoria?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

/**
 * Consume `GET /catalog/search`, `GET /catalog/models/{id}` y
 * `GET /inventory/check-availability` (openapi.yaml líneas 59-244) — RF-1.1
 * y RF-1.4 (features/01_catalogo_inventario.feature).
 *
 * Los tres endpoints son públicos o solo requieren rol `cliente`
 * (x-roles), sin escritura: no hay riesgo de invocar un endpoint que
 * Backend todavía no haya terminado de implementar en su rama paralela —el
 * contrato ya está fijo en openapi.yaml (ver PROMPT_IMPLEMENTACION.md, A.7).
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  search(params: CatalogSearchParams = {}): Observable<ToolModel[]> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        httpParams = httpParams.set(key, value);
      }
    }
    return this.http.get<ToolModel[]>(`${this.baseUrl}/catalog/search`, {
      params: httpParams,
    });
  }

  getModelById(id: string): Observable<ToolModel> {
    return this.http.get<ToolModel>(`${this.baseUrl}/catalog/models/${id}`);
  }

  /** RF-1.4: disponibilidad real de unidades no reservadas en un rango de fechas. */
  checkAvailability(
    modeloId: string,
    fechaInicio: string,
    fechaFin: string,
  ): Observable<AvailabilityResult> {
    const params = new HttpParams()
      .set('modelo_id', modeloId)
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);
    return this.http.get<AvailabilityResult>(
      `${this.baseUrl}/inventory/check-availability`,
      { params },
    );
  }
}
