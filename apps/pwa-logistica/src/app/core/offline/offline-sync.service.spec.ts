import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { OfflineSyncService } from './offline-sync.service';
import { OfflineQueueService, QueuedMutation } from './offline-queue.service';
import { InventoryService } from '../inventory/inventory.service';
import { InspectionService } from '../inspections/inspection.service';
import { ToolUnitStatusLogEntry } from '../models/inventory.models';
import { InspectionChecklist } from '../models/inspection.models';

const mockLogEntry: ToolUnitStatusLogEntry = {
  id: 'log-1',
  unidad_id: 'u1',
  estado_anterior: 'Nuevo',
  estado_nuevo: 'Operativo',
  autor_id: 'autor-1',
  created_at: '2026-08-27T00:00:00Z',
};

const mockChecklist: InspectionChecklist = {
  id: 'checklist-1',
  unidad_id: 'u2',
  shipment_id: 's1',
  tipo: 'recepcion',
  garantia_ejecutada: false,
};

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;
  let queueSpy: jasmine.SpyObj<OfflineQueueService>;
  let inventorySpy: jasmine.SpyObj<InventoryService>;
  let inspectionsSpy: jasmine.SpyObj<InspectionService>;

  beforeEach(() => {
    queueSpy = jasmine.createSpyObj('OfflineQueueService', ['getAll', 'remove', 'enqueue']);
    inventorySpy = jasmine.createSpyObj('InventoryService', ['updateUnitStatus']);
    inspectionsSpy = jasmine.createSpyObj('InspectionService', ['submitChecklist']);

    TestBed.configureTestingModule({
      providers: [
        { provide: OfflineQueueService, useValue: queueSpy },
        { provide: InventoryService, useValue: inventorySpy },
        { provide: InspectionService, useValue: inspectionsSpy },
      ],
    });

    service = TestBed.inject(OfflineSyncService);
  });

  describe('refreshPendingCount', () => {
    it('setea pendingCount con la cantidad de mutaciones encoladas', async () => {
      queueSpy.getAll.and.resolveTo([
        { id: 1, unidadId: 'u1', body: { estado_nuevo: 'Operativo' }, queuedAt: 'x' },
        { id: 2, unidadId: 'u2', body: { estado_nuevo: 'En Mantenimiento' }, queuedAt: 'y' },
      ] as QueuedMutation[]);

      await service.refreshPendingCount();

      expect(service.pendingCount()).toBe(2);
    });

    it('setea pendingCount en 0 si no hay mutaciones pendientes', async () => {
      queueSpy.getAll.and.resolveTo([]);

      await service.refreshPendingCount();

      expect(service.pendingCount()).toBe(0);
    });
  });

  describe('flush', () => {
    it('reintenta un cambio de estado (status-change / sin kind) y lo remueve de la cola al confirmarse', async () => {
      // Simula el comportamiento real de la cola: `remove()` la vacía, así
      // que `refreshPendingCount()` (que vuelve a llamar `getAll()` al final
      // de `flush()`) refleja la lista ya sin el ítem procesado.
      const items: QueuedMutation[] = [
        { id: 1, unidadId: 'u1', body: { estado_nuevo: 'Operativo' }, queuedAt: 'x' },
      ];
      queueSpy.getAll.and.callFake(() => Promise.resolve([...items]));
      queueSpy.remove.and.callFake((id: number) => {
        const index = items.findIndex((i) => i.id === id);
        if (index !== -1) items.splice(index, 1);
        return Promise.resolve();
      });
      inventorySpy.updateUnitStatus.and.returnValue(of(mockLogEntry));

      await service.flush();

      expect(inventorySpy.updateUnitStatus).toHaveBeenCalledWith('u1', {
        estado_nuevo: 'Operativo',
      });
      expect(inspectionsSpy.submitChecklist).not.toHaveBeenCalled();
      expect(queueSpy.remove).toHaveBeenCalledWith(1);
      expect(service.pendingCount()).toBe(0);
    });

    it('Sprint 5: reintenta un checklist de inspección (kind inspection-checklist) usando InspectionService', async () => {
      const item: QueuedMutation = {
        id: 2,
        kind: 'inspection-checklist',
        unidadId: 'u2',
        body: { shipment_id: 's1', tipo: 'recepcion' },
        queuedAt: 'y',
      };
      queueSpy.getAll.and.resolveTo([item]);
      inspectionsSpy.submitChecklist.and.returnValue(of(mockChecklist));

      await service.flush();

      expect(inspectionsSpy.submitChecklist).toHaveBeenCalledWith('u2', {
        shipment_id: 's1',
        tipo: 'recepcion',
      });
      expect(inventorySpy.updateUnitStatus).not.toHaveBeenCalled();
      expect(queueSpy.remove).toHaveBeenCalledWith(2);
    });

    it('procesa la cola en orden y se detiene en el primer error, sin remover ese ítem', async () => {
      const item1: QueuedMutation = {
        id: 1,
        unidadId: 'u1',
        body: { estado_nuevo: 'Operativo' },
        queuedAt: 'x',
      };
      const item2: QueuedMutation = {
        id: 2,
        unidadId: 'u2',
        body: { estado_nuevo: 'En Mantenimiento' },
        queuedAt: 'y',
      };
      queueSpy.getAll.and.resolveTo([item1, item2]);
      inventorySpy.updateUnitStatus.and.returnValue(
        throwError(() => new Error('sin conexión')),
      );

      await service.flush();

      expect(inventorySpy.updateUnitStatus).toHaveBeenCalledTimes(1);
      expect(inventorySpy.updateUnitStatus).toHaveBeenCalledWith('u1', {
        estado_nuevo: 'Operativo',
      });
      expect(queueSpy.remove).not.toHaveBeenCalled();
    });

    it('no llama a remove si el ítem no tiene id', async () => {
      const item: QueuedMutation = {
        unidadId: 'u1',
        body: { estado_nuevo: 'Operativo' },
        queuedAt: 'x',
      } as QueuedMutation;
      queueSpy.getAll.and.resolveTo([item]);
      inventorySpy.updateUnitStatus.and.returnValue(of(mockLogEntry));

      await service.flush();

      expect(queueSpy.remove).not.toHaveBeenCalled();
    });

    it('refresca pendingCount después de intentar vaciar la cola', async () => {
      queueSpy.getAll.and.resolveTo([]);

      await service.flush();

      // getAll se llama una vez para procesar la cola y otra dentro de
      // refreshPendingCount() al final de flush().
      expect(queueSpy.getAll).toHaveBeenCalledTimes(2);
      expect(service.pendingCount()).toBe(0);
    });
  });

  describe('reconexión automática', () => {
    it('reintenta la cola automáticamente cuando el navegador dispara el evento "online"', () => {
      spyOn(service, 'flush').and.resolveTo();

      window.dispatchEvent(new Event('online'));

      expect(service.flush).toHaveBeenCalled();
    });
  });
});
