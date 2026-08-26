import { Injectable } from "@nestjs/common";
import type { EstadoEnvio, TipoEnvio } from "@toolboxjl/shared-types";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";
import type { RangoPeriodo } from "../../domain/revenue.repository";
import type {
  DeliveryProductivityRepository,
  ProductividadRepartidor,
} from "../../domain/delivery-productivity.repository";

function esExitosa(tipo: string, estado: string): boolean {
  return (tipo === "entrega" && estado === "entregado") || (tipo === "recogida" && estado === "retornado");
}

@Injectable()
export class PrismaDeliveryProductivityRepository implements DeliveryProductivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarPorRepartidor(mes: RangoPeriodo): Promise<ProductividadRepartidor[]> {
    const vehiculos = await this.prisma.vehicle.findMany({
      where: { repartidorId: { not: null } },
      select: { id: true, repartidorId: true },
    });
    const repartidorPorVehiculo = new Map(vehiculos.map((v) => [v.id, v.repartidorId as string]));
    if (repartidorPorVehiculo.size === 0) {
      return [];
    }

    const rutas = await this.prisma.route.findMany({
      where: {
        vehiculoId: { in: [...repartidorPorVehiculo.keys()] },
        fecha: { gte: mes.desde, lt: mes.hasta },
      },
      select: { vehiculoId: true, paradas: true },
    });

    const paradas: { vehiculoId: string; shipmentId: string }[] = [];
    const shipmentIds = new Set<string>();
    for (const ruta of rutas) {
      // `Route.paradas` es jsonb (array de shipment_id) — ver doc-comment de
      // `PrismaRouteRepository.aDominio` (misma forma asumida acá).
      const ids = (ruta.paradas as unknown as string[]) ?? [];
      for (const shipmentId of ids) {
        paradas.push({ vehiculoId: ruta.vehiculoId, shipmentId });
        shipmentIds.add(shipmentId);
      }
    }
    if (shipmentIds.size === 0) {
      return [];
    }

    const shipments = await this.prisma.shipment.findMany({
      where: { id: { in: [...shipmentIds] } },
      select: { id: true, tipo: true, estadoEnvio: true },
    });
    const shipmentPorId = new Map<string, { tipo: TipoEnvio; estadoEnvio: EstadoEnvio }>(
      shipments.map((s) => [s.id, { tipo: s.tipo as TipoEnvio, estadoEnvio: s.estadoEnvio as EstadoEnvio }]),
    );

    const porRepartidor = new Map<string, { entregasExitosas: number; rutaAsignada: number }>();
    for (const { vehiculoId, shipmentId } of paradas) {
      const repartidorId = repartidorPorVehiculo.get(vehiculoId);
      if (!repartidorId) {
        continue;
      }
      const shipment = shipmentPorId.get(shipmentId);
      if (!shipment) {
        // Dato corrupto/borrado después de publicar la ruta — mismo criterio
        // que `VerMiRutaUseCase` (se omite la parada en vez de romper toda
        // la respuesta).
        continue;
      }

      const actual = porRepartidor.get(repartidorId) ?? { entregasExitosas: 0, rutaAsignada: 0 };
      actual.rutaAsignada += 1;
      if (esExitosa(shipment.tipo, shipment.estadoEnvio)) {
        actual.entregasExitosas += 1;
      }
      porRepartidor.set(repartidorId, actual);
    }

    return [...porRepartidor.entries()].map(([repartidorId, v]) => ({ repartidorId, ...v }));
  }
}
