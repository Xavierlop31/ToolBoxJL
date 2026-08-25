import { TestBed } from '@angular/core/testing';

import { OfflineQueueService } from './offline-queue.service';

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;

  beforeEach(() => {
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
    expect(items.length).toBe(1);
    expect(items[0].unidadId).toBe('unidad-1');

    await service.remove(items[0].id as number);
    const afterRemoval = await service.getAll();
    expect(afterRemoval.length).toBe(0);
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
    expect(items.length).toBe(2);
    expect(items[0].kind).toBeUndefined();
    expect(items[1].kind).toBe('inspection-checklist');
  });
});
