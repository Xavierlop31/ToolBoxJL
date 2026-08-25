import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";
import type { EstadoPago, MetodoPago, Payment, TipoPago } from "@toolboxjl/shared-types";
import type { NuevoPagoInput, PaymentRepository } from "../../domain/payment.repository";
import type { Payment as PrismaPayment } from "@prisma/client";

function aDominio(p: PrismaPayment): Payment {
  return {
    id: p.id,
    order_id: p.orderId,
    tipo: p.tipo as TipoPago,
    metodo: p.metodo as MetodoPago,
    estado: p.estado as EstadoPago,
    monto: p.monto,
    wompi_transaction_id: p.wompiTransactionId,
  };
}

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: NuevoPagoInput): Promise<Payment> {
    const creado = await this.prisma.payment.create({
      data: {
        orderId: input.orderId,
        tipo: input.tipo,
        metodo: input.metodo,
        estado: input.estado,
        monto: input.monto,
        wompiTransactionId: input.wompiTransactionId,
      },
    });
    return aDominio(creado);
  }

  async buscarPorId(id: string): Promise<Payment | null> {
    const encontrado = await this.prisma.payment.findUnique({ where: { id } });
    return encontrado ? aDominio(encontrado) : null;
  }

  async listarPorOrden(orderId: string): Promise<Payment[]> {
    const pagos = await this.prisma.payment.findMany({ where: { orderId } });
    return pagos.map(aDominio);
  }

  async actualizarEstado(id: string, estado: EstadoPago): Promise<Payment> {
    const actualizado = await this.prisma.payment.update({
      where: { id },
      data: { estado },
    });
    return aDominio(actualizado);
  }
}
