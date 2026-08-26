import { Injectable } from '@angular/core';

import { MyRouteResponse } from '../models/logistics.models';

/**
 * Cache de solo lectura de la última `GET /logistics/my-route` exitosa
 * (RNF-7, offline-first transversal desde Sprint 1 — docs/DESIGN.md §8).
 *
 * A diferencia de `OfflineQueueService` (cola de MUTACIONES pendientes en
 * IndexedDB, para reintentar al reconectar), esto es una foto de lectura:
 * la ruta del día es de solo lectura para el Repartidor este sprint, así
 * que no hace falta cola ni sincronización — alcanza con `localStorage`
 * (valor único, se pisa en cada carga exitosa) para que la pantalla no
 * quede en blanco si se abre sin conexión. Mismo criterio de "no hace
 * falta IndexedDB para esto" documentado en el Issue #23.
 */
@Injectable({ providedIn: 'root' })
export class RouteCacheService {
  private readonly storageKey = 'toolboxjl-pwa-logistica:my-route';

  save(data: MyRouteResponse): void {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Storage no disponible (modo privado, cuota excedida, etc.) — la
      // ruta ya se mostró desde la respuesta HTTP en curso, así que no
      // cachear no rompe la carga actual, solo el fallback offline futuro.
    }
  }

  load(): MyRouteResponse | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as MyRouteResponse) : null;
    } catch {
      return null;
    }
  }
}
