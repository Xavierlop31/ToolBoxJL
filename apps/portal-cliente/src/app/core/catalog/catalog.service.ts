import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AvailabilityResult, ToolModel, Zona } from '../models/catalog.models';
import { Quote, OrderInput, Order, Payment, MetodoPago } from '../models/order.models';

export interface CatalogSearchParams {
  q?: string;
  categoria?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  search(params: CatalogSearchParams = {}): Observable<ToolModel[]> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.categoria) httpParams = httpParams.set('categoria', params.categoria);
    if (params.fecha_inicio) httpParams = httpParams.set('fecha_inicio', params.fecha_inicio);
    if (params.fecha_fin) httpParams = httpParams.set('fecha_fin', params.fecha_fin);

    return this.http.get<ToolModel[]>(`${this.apiUrl}/catalog/search`, { params: httpParams });
  }

  getModelById(id: string): Observable<ToolModel> {
    return this.http.get<ToolModel>(`${this.apiUrl}/catalog/models/${id}`);
  }

  checkAvailability(modeloId: string, fechaInicio: string, fechaFin: string): Observable<AvailabilityResult> {
    const params = new HttpParams()
      .set('modelo_id', modeloId)
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);
    return this.http.get<AvailabilityResult>(`${this.apiUrl}/inventory/check-availability`, { params });
  }

  createQuote(input: OrderInput): Observable<Quote> {
    return this.http.post<Quote>(`${this.apiUrl}/orders/quote`, input);
  }

  createOrder(input: OrderInput): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders`, input);
  }

  payOrder(orderId: string, metodo: MetodoPago): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/orders/${orderId}/pay`, { metodo });
  }

  /** `GET /zones?ciudad=` (HU-12.2) — reemplaza el array de zonas hardcodeado del form. */
  getZones(ciudad?: string): Observable<Zona[]> {
    let params = new HttpParams();
    if (ciudad) params = params.set('ciudad', ciudad);
    return this.http.get<Zona[]>(`${this.apiUrl}/zones`, { params });
  }
}
