import { Injectable } from '@angular/core';

import { UpdateUnitStatusInput } from '../models/inventory.models';

export interface QueuedStatusChange {
  id?: number;
  unidadId: string;
  body: UpdateUnitStatusInput;
  queuedAt: string;
}

/**
 * Cola de mutaciones offline (IndexedDB) para `PATCH
 * /inventory/units/{id}/status` — arranque de la PWA offline-first exigida
 * por la Definition of Done de Fase 1 (docs/DESIGN.md §8, "Offline
 * capability"). Cuando el almacenista/repartidor registra un cambio de
 * estado sin conectividad, la mutación se encola acá en vez de perderse;
 * `OfflineSyncService` la reintenta al reconectar.
 *
 * Se usa IndexedDB nativo (sin librería adicional) porque ChromeHeadless
 * (usado en `pnpm test`) y todos los navegadores objetivo de la PWA lo
 * soportan de forma nativa.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private readonly dbName = 'toolboxjl-pwa-logistica';
  private readonly storeName = 'pending-status-changes';
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('IndexedDB no disponible en este entorno.'));
          return;
        }
        const request = indexedDB.open(this.dbName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, {
              keyPath: 'id',
              autoIncrement: true,
            });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  async enqueue(item: Omit<QueuedStatusChange, 'id'>): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).add(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAll(): Promise<QueuedStatusChange[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const req = tx.objectStore(this.storeName).getAll();
      req.onsuccess = () => resolve(req.result as QueuedStatusChange[]);
      req.onerror = () => reject(req.error);
    });
  }

  async remove(id: number): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
