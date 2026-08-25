import { Inject, Injectable } from "@nestjs/common";
import type { Payment } from "@toolboxjl/shared-types";
import { PAYMENT_REPOSITORY } from "../infrastructure/payments.tokens";
import type { PaymentRepository } from "../domain/payment.repository";
import { ORDER_REPOSITORY } from "../../orders/infrastructure/orders.tokens";
import type { OrderRepository } from "../../orders/domain/order.repository";
import { OrdenNoEncontradaError } from "../../orders/domain/errors/orden-no-encontrada.error";
import { SinPagosPendientesError } from "../domain/errors/sin-pagos-pendientes.error";

/**
 * RF-2.4 — confirma, desde la PWA del Repartidor, que el pago contra
 * entrega fue recibido: pasa a `capturado` todos los `Payment` de la orden
 * que estén en `pendiente` (principal + depósito de garantía si aplica).
 * No cambia el estado de la orden (`confirmada` se mantiene — el ciclo de
 * entrega/`en_curso` es responsabilidad de LogisticsModule, Sprint 4).
 */
@Injectable()
export class ConfirmarPagoContraEntregaUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
    @Inject(PAYMENT_REPOSITORY)
    private readonly pagos: PaymentRepository,
  ) {}

  async ejecutar(ordenId: string): Promise<Payment[]> {
    const orden = await this.ordenes.buscarPorId(ordenId);
    if (!orden) {
      throw new OrdenNoEncontradaError(ordenId);
    }

    const pagosDeLaOrden = await this.pagos.listarPorOrden(ordenId);
    const pendientes = pagosDeLaOrden.filter((p) => p.estado === "pendiente");
    if (pendientes.length === 0) {
      throw new SinPagosPendientesError(ordenId);
    }

    const confirmados: Payment[] = [];
    for (const pago of pendientes) {
      confirmados.push(await this.pagos.actualizarEstado(pago.id, "capturado"));
    }
    return confirmados;
  }
}
