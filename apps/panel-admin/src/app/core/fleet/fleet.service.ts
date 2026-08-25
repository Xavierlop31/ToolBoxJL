import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Vehicle, VehicleInput } from '../models/fleet.models';

/**
 * Consume `POST /fleet/vehicles` (RF-3.1 — Admin registra un vehículo de la
 * flota), openapi.yaml líneas 397-417. Requiere rol admin (`x-roles`).
 */
@Injectable({ providedIn: 'root' })
export class FleetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  registrarVehiculo(input: VehicleInput): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.baseUrl}/fleet/vehicles`, input);
  }
}
