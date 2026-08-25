import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  InspectionChecklist,
  InspectionChecklistInput,
} from '../models/inspection.models';

/**
 * Consume `POST /inspections` (RF-4.2 — checklist de inspección de
 * salida/recepción de una unidad física, con evidencia fotográfica),
 * openapi.yaml líneas 481-504. Requiere rol almacenista/repartidor.
 */
@Injectable({ providedIn: 'root' })
export class InspectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * `unidadId` llega por separado (route param `:unidadId`, ver
   * `InspectionChecklistComponent`) y se combina acá con el resto del
   * body — el llamador no repite `unidad_id` a mano.
   */
  submitChecklist(
    unidadId: string,
    input: Omit<InspectionChecklistInput, 'unidad_id'>,
  ): Observable<InspectionChecklist> {
    const body: InspectionChecklistInput = { ...input, unidad_id: unidadId };
    return this.http.post<InspectionChecklist>(
      `${this.baseUrl}/inspections`,
      body,
    );
  }
}
