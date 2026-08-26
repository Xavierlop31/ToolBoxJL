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
 */
@Injectable({ providedIn: 'root' })
export class MyRouteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getMyRoute(): Observable<MyRouteResponse> {
    return this.http.get<MyRouteResponse>(`${this.baseUrl}/logistics/my-route`);
  }
}
