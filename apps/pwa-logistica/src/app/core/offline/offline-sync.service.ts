import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { InventoryService } from '../inventory/inventory.service';
import { OfflineQueueService } from './offline-queue.service';

/**
 * Reintenta las mutaciones encoladas por `OfflineQueueService` cuando el
 * navegador recupera conectividad (`window.addEventListener('online', ...)`).
 * Es intencionalmente secuencial y se detiene en el primer error para no
 * perder el orden de la hoja de vida de una misma unidad.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly queue = inject(OfflineQueueService);
  private readonly inventory = inject(InventoryService);

  readonly pendingCount = signal(0);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => void this.flush());
    }
    void this.refreshPendingCount();
  }

  async refreshPendingCount(): Promise<void> {
    const items = await this.queue.getAll();
    this.pendingCount.set(items.length);
  }

  async flush(): Promise<void> {
    const items = await this.queue.getAll();
    for (const item of items) {
      try {
        await firstValueFrom(
          this.inventory.updateUnitStatus(item.unidadId, item.body),
        );
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
