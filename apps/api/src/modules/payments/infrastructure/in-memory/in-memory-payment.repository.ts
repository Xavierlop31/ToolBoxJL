import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { EstadoPago, Payment } from "@toolboxjl/shared-types";
import type { NuevoPagoInput, PaymentRepository } from "../../domain/payment.repository";

@Injectable()
export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly pagos = new Map<string, Payment>();

  async crear(input: NuevoPagoInput): Promise<Payment> {
    const pago: Payment = {
      id: randomUUID(),
      order_id: input.orderId,
      tipo: input.tipo,
      metodo: input.metodo,
      estado: input.estado,
      monto: input.monto,
      wompi_transaction_id: input.wompiTransactionId,
    };
    this.pagos.set(pago.id, pago);
    return pago;
  }

  async buscarPorId(id: string): Promise<Payment | null> {
    return this.pagos.get(id) ?? null;
  }

  async listarPorOrden(orderId: string): Promise<Payment[]> {
    return [...this.pagos.values()].filter((p) => p.order_id === orderId);
  }

  async actualizarEstado(id: string, estado: EstadoPago): Promise<Payment> {
    const pago = this.pagos.get(id);
    if (!pago) {
      throw new Error(`No existe un pago con id "${id}".`);
    }
    const actualizado: Payment = { ...pago, estado };
    this.pagos.set(id, actualizado);
    return actualizado;
  }
}
