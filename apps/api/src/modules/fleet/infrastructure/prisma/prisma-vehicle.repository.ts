import { Injectable } from "@nestjs/common";
import type { Vehicle as PrismaVehicle } from "@prisma/client";
import type { TipoVehiculo, Vehicle, VehicleInput } from "@toolboxjl/shared-types";
import type { VehicleRepository } from "../../domain/vehicle.repository";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

function aDominio(v: PrismaVehicle): Vehicle {
  return {
    id: v.id,
    tipo: v.tipo as TipoVehiculo,
    capacidad_kg: v.capacidadKg,
    capacidad_m3: v.capacidadM3,
    zonas: v.zonas,
    repartidor_id: v.repartidorId,
  };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de `VehicleRepository`.
 * Requiere `DATABASE_URL` (ver `PrismaService`) — no se usa en tests/BDD.
 */
@Injectable()
export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: VehicleInput): Promise<Vehicle> {
    const creado = await this.prisma.vehicle.create({
      data: {
        tipo: input.tipo,
        capacidadKg: input.capacidad_kg,
        capacidadM3: input.capacidad_m3,
        zonas: input.zonas ?? [],
        repartidorId: input.repartidor_id ?? undefined,
      },
    });
    return aDominio(creado);
  }

  async buscarPorId(id: string): Promise<Vehicle | null> {
    const encontrado = await this.prisma.vehicle.findUnique({ where: { id } });
    return encontrado ? aDominio(encontrado) : null;
  }

  async buscarPorRepartidorId(repartidorId: string): Promise<Vehicle | null> {
    const encontrado = await this.prisma.vehicle.findFirst({
      where: { repartidorId },
    });
    return encontrado ? aDominio(encontrado) : null;
  }
}
