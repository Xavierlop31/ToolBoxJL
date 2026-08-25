import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { InspectionService } from '../inspections/inspection.service';
import { InventoryService } from '../inventory/inventory.service';
import { OfflineQueueService } from './offline-queue.service';

/**
 * Reintenta las mutaciones encoladas por `OfflineQueueService` cuando el
 * navegador recupera conectividad (`window.addEventListener('online', ...)`).
 * Es intencionalmente secuencial y se detiene en el primer error para no
 * perder el orden de la hoja de vida de una misma unidad. Distingue por
 * `kind` (Sprint 5) entre cambios de estado (`unit-detail`) y checklists de
 * inspección (`inspection-checklist`) — un ítem sin `kind` (encolado antes
 * de Sprint 5) se sigue tratando como cambio de estado.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly queue = inject(OfflineQueueService);
  private readonly inventory = inject(InventoryService);
  private readonly inspections = inject(InspectionService);

  readonly pendingCount = signal(0);

  // No se dispara ninguna operación async desde el constructor
  // (typescript:S7059 — un constructor no puede ser `async`/`await`-eado).
  // `refreshPendingCount()` ya se invoca explícitamente desde los flujos que
  // mutan la cola offline: `enqueueOffline()` en los componentes que
  // encolan cambios y el propio `flush()` de este servicio al reconectar;
  // `pendingCount` no se lee todavía en ningún template, así que no hay
  // consumidor que dependiera del valor inicial calculado en el arranque.
  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => void this.flush());
    }
  }

  async refreshPendingCount(): Promise<void> {
    const items = await this.queue.getAll();
    this.pendingCount.set(items.length);
  }

  async flush(): Promise<void> {
    const items = await this.queue.getAll();
    for (const item of items) {
      try {
        if (item.kind === 'inspection-checklist') {
          await firstValueFrom(
            this.inspections.submitChecklist(item.unidadId, item.body),
          );
        } else {
          await firstValueFrom(
            this.inventory.updateUnitStatus(item.unidadId, item.body),
          );
        }
        if (item.id !== undefined) {
          await this.queue.remove(item.id);
        }
      } catch {
        // Seguimos offline o el backend rechazó la mutación: se reintenta en
        // el próximo evento `online` / próxima llamada a flush().
        break;
      }
    }
    await this.refreshPendingCount();
  }
}
