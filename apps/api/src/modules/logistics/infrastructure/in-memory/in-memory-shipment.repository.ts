import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { EstadoEnvio, Shipment } from "@toolboxjl/shared-types";
import type { NuevoShipmentInput, ShipmentRepository } from "../../domain/shipment.repository";

/**
 * Implementación en memoria de `ShipmentRepository` — usada SOLO por los
 * tests unitarios y los steps de Cucumber. No usar en runtime de producción.
 */
@Injectable()
export class InMemoryShipmentRepository implements ShipmentRepository {
  private readonly shipments = new Map<string, Shipment>();

  async crear(input: NuevoShipmentInput): Promise<Shipment> {
    const shipment: Shipment = {
      id: randomUUID(),
      order_id: input.orderId,
      vehiculo_id: input.vehiculoId,
      tipo: input.tipo,
      estado_envio: input.estadoEnvio,
    };
    this.shipments.set(shipment.id, shipment);
    return shipment;
  }

  async buscarPorId(id: string): Promise<Shipment | null> {
    return this.shipments.get(id) ?? null;
  }

  async listarPendientesDeAsignacion(): Promise<Shipment[]> {
    return [...this.shipments.values()].filter(
      (s) => s.estado_envio === "pendiente_asignacion",
    );
  }

  async listarTodos(): Promise<Shipment[]> {
    return [...this.shipments.values()];
  }

  async asignarVehiculoYEstado(
    id: string,
    vehiculoId: string,
    estadoEnvio: EstadoEnvio,
  ): Promise<Shipment> {
    const shipment = this.shipments.get(id);
    if (!shipment) {
      throw new Error(`No existe un envío (shipment) con id "${id}".`);
    }
    const actualizado: Shipment = { ...shipment, vehiculo_id: vehiculoId, estado_envio: estadoEnvio };
    this.shipments.set(id, actualizado);
    return actualizado;
  }
}
