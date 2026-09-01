import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AvailabilityResult, ToolModel, Zona } from '../models/catalog.models';
import { Quote, OrderInput, Order, Payment, MetodoPago } from '../models/order.models';

export interface CatalogSearchParams {
  q?: string;
  categoria?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface ListMyOrdersParams {
  estado?: Order['estado'];
  page?: number;
  pageSize?: number;
}

export interface ListMyOrdersResult {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
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

  /**
   * `GET /catalog/search` con `page`/`pageSize` (HU-12.1) — a diferencia de
   * `search()`, este devuelve `{items, total}`, leyendo el total real del
   * header `X-Total-Count` (el body sigue siendo solo la página pedida, el
   * backend nunca cambia la forma del array para no romper a los Agentes
   * 2/3, que llaman `search()` sin paginar).
   */
  searchPaged(
    params: CatalogSearchParams,
    page: number,
    pageSize: number,
  ): Observable<PagedResult<ToolModel>> {
    let httpParams = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.categoria) httpParams = httpParams.set('categoria', params.categoria);
    if (params.fecha_inicio) httpParams = httpParams.set('fecha_inicio', params.fecha_inicio);
    if (params.fecha_fin) httpParams = httpParams.set('fecha_fin', params.fecha_fin);

    return this.http
      .get<ToolModel[]>(`${this.apiUrl}/catalog/search`, {
        params: httpParams,
        observe: 'response',
      })
      .pipe(
        map((response) => ({
          items: response.body ?? [],
          total: Number(response.headers.get('X-Total-Count') ?? response.body?.length ?? 0),
        })),
      );
  }

  /** `GET /orders` (HU-12.1) — "Mis Pedidos Activos" del cliente autenticado. */
  listMyOrders(params: ListMyOrdersParams = {}): Observable<ListMyOrdersResult> {
    let httpParams = new HttpParams();
    if (params.estado) httpParams = httpParams.set('estado', params.estado);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);

    return this.http.get<ListMyOrdersResult>(`${this.apiUrl}/orders`, { params: httpParams });
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
