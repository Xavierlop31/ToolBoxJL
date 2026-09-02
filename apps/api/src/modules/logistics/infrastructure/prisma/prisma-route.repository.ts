import { Injectable } from "@nestjs/common";
import type { Route as PrismaRoute } from "@prisma/client";
import type { GeneradaPor, Route } from "@toolboxjl/shared-types";
import type { NuevaRutaInput, RouteRepository } from "../../domain/route.repository";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

function aDominio(r: PrismaRoute): Route {
  return {
    id: r.id,
    vehiculo_id: r.vehiculoId,
    fecha: r.fecha.toISOString().slice(0, 10),
    // `paradas` se persiste como jsonb (docs/DESIGN.md §4.1) — acá siempre
    // es un array de shipment_id (uuid) escrito por `crear()` abajo.
    paradas: r.paradas as string[],
    generada_por: r.generadaPor as GeneradaPor,
  };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de `RouteRepository`.
 * Requiere `DATABASE_URL` (ver `PrismaService`) — no se usa en tests/BDD.
 */
@Injectable()
export class PrismaRouteRepository implements RouteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: NuevaRutaInput): Promise<Route> {
    const creado = await this.prisma.route.create({
      data: {
        vehiculoId: input.vehiculoId,
        fecha: new Date(input.fecha),
        paradas: input.paradas,
        generadaPor: input.generadaPor,
      },
    });
    return aDominio(creado);
  }

  async buscarPorVehiculoYFecha(vehiculoId: string, fecha: string): Promise<Route | null> {
    const encontrada = await this.prisma.route.findFirst({
      where: { vehiculoId, fecha: new Date(fecha) },
    });
    return encontrada ? aDominio(encontrada) : null;
  }

  async listarPorFecha(fecha: string): Promise<Route[]> {
    const encontradas = await this.prisma.route.findMany({
      where: { fecha: new Date(fecha) },
    });
    return encontradas.map(aDominio);
  }
}
