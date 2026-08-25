import { TestBed } from '@angular/core/testing';

import { OfflineQueueService } from './offline-queue.service';

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;

  beforeEach(async () => {
    // La IndexedDB de OfflineQueueService persiste entre tests (no es un
    // mock en memoria) — sin este vaciado, un `it()` puede ver ítems
    // encolados por otro (orden de ejecución no garantizado entre entornos:
    // pasó en local pero falló en CI con un orden distinto). Se vacía el
    // object store en vez de borrar la base completa: `deleteDatabase`
    // queda bloqueado mientras la conexión del test anterior sigue abierta
    // (el servicio nunca la cierra), colgando el test siguiente.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('toolboxjl-pwa-logistica', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('pending-status-changes')) {
          db.createObjectStore('pending-status-changes', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('pending-status-changes', 'readwrite');
        tx.objectStore('pending-status-changes').clear();
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
      request.onerror = () => reject(request.error);
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(OfflineQueueService);
  });

  it('encola, lista y remueve mutaciones pendientes (IndexedDB)', async () => {
    await service.enqueue({
      unidadId: 'unidad-1',
      body: { estado_nuevo: 'Operativo' },
      queuedAt: new Date().toISOString(),
    });

    const items = await service.getAll();
    expect(items).toHaveSize(1);
    expect(items[0].unidadId).toBe('unidad-1');

    await service.remove(items[0].id as number);
    const afterRemoval = await service.getAll();
    expect(afterRemoval).toHaveSize(0);
  });

  it('Sprint 5: encola un checklist de inspección junto a cambios de estado sin romper el flujo existente', async () => {
    await service.enqueue({
      unidadId: 'unidad-1',
      body: { estado_nuevo: 'Operativo' },
      queuedAt: new Date().toISOString(),
    });
    await service.enqueue({
      kind: 'inspection-checklist',
      unidadId: 'unidad-2',
      body: { shipment_id: 'shipment-1', tipo: 'recepcion' },
      queuedAt: new Date().toISOString(),
    });

    const items = await service.getAll();
    expect(items).toHaveSize(2);
    expect(items[0].kind).toBeUndefined();
    expect(items[1].kind).toBe('inspection-checklist');
  });
});
