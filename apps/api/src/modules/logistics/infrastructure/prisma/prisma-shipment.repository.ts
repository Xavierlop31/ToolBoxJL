import { Injectable } from "@nestjs/common";
import type { Shipment as PrismaShipment } from "@prisma/client";
import type { EstadoEnvio, Shipment, TipoEnvio } from "@toolboxjl/shared-types";
import type { NuevoShipmentInput, ShipmentRepository } from "../../domain/shipment.repository";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

function aDominio(s: PrismaShipment): Shipment {
  return {
    id: s.id,
    order_id: s.orderId,
    vehiculo_id: s.vehiculoId,
    tipo: s.tipo as TipoEnvio,
    estado_envio: s.estadoEnvio as EstadoEnvio,
  };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de `ShipmentRepository`.
 * Requiere `DATABASE_URL` (ver `PrismaService`) — no se usa en tests/BDD.
 */
@Injectable()
export class PrismaShipmentRepository implements ShipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: NuevoShipmentInput): Promise<Shipment> {
    const creado = await this.prisma.shipment.create({
      data: {
        orderId: input.orderId,
        tipo: input.tipo,
        estadoEnvio: input.estadoEnvio,
        vehiculoId: input.vehiculoId ?? undefined,
      },
    });
    return aDominio(creado);
  }

  async buscarPorId(id: string): Promise<Shipment | null> {
    const encontrado = await this.prisma.shipment.findUnique({ where: { id } });
    return encontrado ? aDominio(encontrado) : null;
  }

  async listarPendientesDeAsignacion(): Promise<Shipment[]> {
    const encontrados = await this.prisma.shipment.findMany({
      where: { estadoEnvio: "pendiente_asignacion" },
    });
    return encontrados.map(aDominio);
  }

  async listarTodos(): Promise<Shipment[]> {
    const encontrados = await this.prisma.shipment.findMany();
    return encontrados.map(aDominio);
  }

  async asignarVehiculoYEstado(
    id: string,
    vehiculoId: string,
    estadoEnvio: EstadoEnvio,
  ): Promise<Shipment> {
    const actualizado = await this.prisma.shipment.update({
      where: { id },
      data: { vehiculoId, estadoEnvio },
    });
    return aDominio(actualizado);
  }

  async actualizarEstadoEnvio(id: string, estadoEnvio: EstadoEnvio): Promise<Shipment> {
    const actualizado = await this.prisma.shipment.update({
      where: { id },
      data: { estadoEnvio },
    });
    return aDominio(actualizado);
  }
}
