import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AvailabilityResult, ToolModel } from '../models/catalog.models';
import { Quote, OrderInput, Order } from '../models/order.models';

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
 * Ahora también consume `POST /orders/quote` y `POST /orders` para el flujo
 * de cotización y creación de órdenes (RF-2.1).
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

  /** RF-2.1: Solicitar cotización de alquiler o venta */
  createQuote(input: {
    modelo_id: string;
    tipo: 'alquiler' | 'venta';
    fecha_inicio?: string;
    fecha_fin?: string;
    direccion_entrega: string;
    zona_id: string;
  }): Observable<Quote> {
    return this.http.post<Quote>(`${this.baseUrl}/orders/quote`, input);
  }

  /** Crear orden a partir de la cotización */
  createOrder(input: OrderInput): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders`, input);
  }
}
