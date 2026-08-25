import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Shipment } from '../models/logistics.models';

/**
 * Consume `GET /logistics/shipments` (RF-3.3 — carga inicial del panel de
 * seguimiento de envíos), openapi.yaml líneas 461-479. Requiere rol
 * gerente/admin (`x-roles`). Las actualizaciones en vivo posteriores a la
 * carga inicial llegan por Supabase Realtime — ver
 * logistics-realtime.service.ts, no por polling de este endpoint.
 */
@Injectable({ providedIn: 'root' })
export class LogisticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getShipments(): Observable<Shipment[]> {
    return this.http.get<Shipment[]>(`${this.baseUrl}/logistics/shipments`);
  }
}
