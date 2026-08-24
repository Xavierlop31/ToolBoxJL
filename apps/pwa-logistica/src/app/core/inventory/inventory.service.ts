import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ToolUnit,
  ToolUnitStatusLogEntry,
  UpdateUnitStatusInput,
} from '../models/inventory.models';

/**
 * Consume `GET /inventory/units/{id}` (RF-1.2 — ficha al escanear el QR) y
 * `PATCH /inventory/units/{id}/status` (RF-1.3 — cambio de estado + hoja de
 * vida), openapi.yaml líneas 159-210. Ambos requieren rol
 * almacenista/repartidor.
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
}
