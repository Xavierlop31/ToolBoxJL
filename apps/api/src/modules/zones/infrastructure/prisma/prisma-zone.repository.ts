import { Injectable } from "@nestjs/common";
import type { Zone as PrismaZone } from "@prisma/client";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";
import type { Ciudad, ZonaGeografica } from "../../domain/zona-geografica";
import type { ZoneRepository } from "../../domain/zone.repository";

function aDominio(z: PrismaZone): ZonaGeografica {
  return { id: z.id, nombre: z.nombre, ciudad: z.ciudad as Ciudad };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de `ZoneRepository`.
 * Requiere `DATABASE_URL` (ver `PrismaService`) — no se usa en tests/BDD.
 * Reusa el `PrismaService` de CatalogInventoryModule, mismo criterio que
 * OrdersModule.
 */
@Injectable()
export class PrismaZoneRepository implements ZoneRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listar(ciudad?: Ciudad): Promise<ZonaGeografica[]> {
    const encontradas = await this.prisma.zone.findMany({
      where: ciudad ? { ciudad } : undefined,
      orderBy: { nombre: "asc" },
    });
    return encontradas.map(aDominio);
  }
}
