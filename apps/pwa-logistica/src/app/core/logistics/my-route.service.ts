import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MyRouteResponse } from '../models/logistics.models';

/**
 * Consume `GET /logistics/my-route` (HU-8.2 — ruta del día del Repartidor
 * autenticado, ya expandida y en orden de secuencia), openapi.yaml líneas
 * 549-589. Requiere rol repartidor.
 *
 * El backend responde 404 cuando el Repartidor no tiene vehículo asignado o
 * no hay ninguna Route publicada para hoy — eso NO es un error de red, así
 * que se propaga tal cual (como `HttpErrorResponse` con `status === 404`)
 * para que `MiRutaComponent` lo distinga de una falla de conectividad real
 * y muestre el estado vacío correspondiente en vez de reintentar/cachear.
 *
 * `confirmCodPayment()` (2026-09-17, fix de bug real): `POST
 * /orders/{id}/confirm-cod-payment` (openapi.yaml líneas 886-903) ya
 * existía en el backend, probado, pero ningún componente de esta PWA lo
 * llamaba — así que un alquiler pagado contra entrega nunca capturaba su
 * pago y el reporte de Ingresos del Gerente lo excluía para siempre. Ver
 * `pago_pendiente_confirmacion` en `ParadaRuta` para cuándo mostrar el
 * botón que la dispara (`MiRutaComponent`).
 */
@Injectable({ providedIn: 'root' })
export class MyRouteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getMyRoute(): Observable<MyRouteResponse> {
    return this.http.get<MyRouteResponse>(`${this.baseUrl}/logistics/my-route`);
  }

  confirmCodPayment(orderId: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/orders/${orderId}/confirm-cod-payment`, {});
  }
}
