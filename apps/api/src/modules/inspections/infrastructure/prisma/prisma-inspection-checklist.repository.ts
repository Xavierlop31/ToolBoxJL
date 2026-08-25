import { Injectable } from "@nestjs/common";
import type { InspectionChecklist as PrismaInspectionChecklist } from "@prisma/client";
import type { Hallazgo, InspectionChecklist, TipoInspeccion } from "@toolboxjl/shared-types";
import type {
  InspectionChecklistRepository,
  NuevoInspectionChecklistInput,
} from "../../domain/inspection-checklist.repository";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

function aDominio(c: PrismaInspectionChecklist): InspectionChecklist {
  return {
    id: c.id,
    unidad_id: c.unidadId,
    shipment_id: c.shipmentId,
    tipo: c.tipo as TipoInspeccion,
    hallazgos: (c.hallazgos as unknown as Hallazgo[] | null) ?? [],
    fotos_urls: c.fotosUrls,
    garantia_ejecutada: c.garantiaEjecutada,
  };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de
 * `InspectionChecklistRepository`. Requiere `DATABASE_URL` (ver
 * `PrismaService`) — no se usa en tests/BDD.
 */
@Injectable()
export class PrismaInspectionChecklistRepository implements InspectionChecklistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: NuevoInspectionChecklistInput): Promise<InspectionChecklist> {
    const creado = await this.prisma.inspectionChecklist.create({
      data: {
        unidadId: input.unidadId,
        shipmentId: input.shipmentId,
        tipo: input.tipo,
        hallazgos: input.hallazgos as unknown as object[],
        fotosUrls: input.fotosUrls,
        garantiaEjecutada: input.garantiaEjecutada,
      },
    });
    return aDominio(creado);
  }
}
