import { Injectable } from "@nestjs/common";
import { Dinero } from "@toolboxjl/shared-types";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";
import type { IngresosPorTipo, RangoPeriodo, RevenueRepository } from "../../domain/revenue.repository";

@Injectable()
export class PrismaRevenueRepository implements RevenueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async sumarPorTipo(rango: RangoPeriodo | null): Promise<IngresosPorTipo> {
    const filtroFecha: Prisma.PaymentWhereInput = rango
      ? { createdAt: { gte: rango.desde, lt: rango.hasta } }
      : {};

    const [ventas, alquiler, mora] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { monto: true },
        where: { tipo: "pago_venta", estado: "capturado", ...filtroFecha },
      }),
      this.prisma.payment.aggregate({
        _sum: { monto: true },
        where: { tipo: "pago_alquiler", estado: "capturado", ...filtroFecha },
      }),
      this.prisma.payment.aggregate({
        _sum: { monto: true },
        where: { tipo: "cobro_mora", estado: "capturado", ...filtroFecha },
      }),
    ]);

    return {
      ventasDirectas: Dinero.pesos(ventas._sum.monto ?? 0),
      tarifasAlquiler: Dinero.pesos(alquiler._sum.monto ?? 0),
      cobrosMora: Dinero.pesos(mora._sum.monto ?? 0),
    };
  }
}
