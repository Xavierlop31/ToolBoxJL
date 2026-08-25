import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { InspectionChecklist } from "@toolboxjl/shared-types";
import type {
  InspectionChecklistRepository,
  NuevoInspectionChecklistInput,
} from "../../domain/inspection-checklist.repository";

/**
 * Implementación en memoria de `InspectionChecklistRepository` — usada SOLO
 * por los tests unitarios y los steps de Cucumber. No usar en runtime de
 * producción.
 */
@Injectable()
export class InMemoryInspectionChecklistRepository implements InspectionChecklistRepository {
  private readonly checklists = new Map<string, InspectionChecklist>();

  async crear(input: NuevoInspectionChecklistInput): Promise<InspectionChecklist> {
    const checklist: InspectionChecklist = {
      id: randomUUID(),
      unidad_id: input.unidadId,
      shipment_id: input.shipmentId,
      tipo: input.tipo,
      hallazgos: input.hallazgos,
      fotos_urls: input.fotosUrls,
      garantia_ejecutada: input.garantiaEjecutada,
    };
    this.checklists.set(checklist.id, checklist);
    return checklist;
  }
}
