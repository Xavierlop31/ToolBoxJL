import { Injectable } from "@nestjs/common";
import { Dinero } from "@toolboxjl/shared-types";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";
import type { ModeloConIngresos, RoiRepository } from "../../domain/roi.repository";

/** Tipos de `payments.tipo` que cuentan como ingreso (mismo criterio que `PrismaRevenueRepository`, `deposito_garantia` excluido). */
const TIPOS_INGRESO = ["pago_venta", "pago_alquiler", "cobro_mora"] as const;

@Injectable()
export class PrismaRoiRepository implements RoiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarConIngresos(modeloId?: string): Promise<ModeloConIngresos[]> {
    const modelos = await this.prisma.toolModel.findMany({
      where: modeloId ? { id: modeloId } : {},
      select: { id: true, costoCompra: true },
    });

    if (modelos.length === 0) {
      return [];
    }

    // Ver GAP de atribución documentado en domain/roi.repository.ts: cada
    // Payment se atribuye al modelo del PRIMER OrderItem de su Order (`take:
    // 1`) — hoy siempre hay exactamente uno.
    const pagos = await this.prisma.payment.findMany({
      where: {
        estado: "capturado",
        tipo: { in: [...TIPOS_INGRESO] },
        ...(modeloId ? { order: { items: { some: { unidad: { modeloId } } } } } : {}),
      },
      select: {
        monto: true,
        order: { select: { items: { take: 1, select: { unidad: { select: { modeloId: true } } } } } },
      },
    });

    const ingresosPorModelo = new Map<string, number>();
    for (const pago of pagos) {
      const primerItem = pago.order.items[0];
      if (!primerItem) {
        continue;
      }
      const mId = primerItem.unidad.modeloId;
      ingresosPorModelo.set(mId, (ingresosPorModelo.get(mId) ?? 0) + pago.monto);
    }

    return modelos.map((m) => ({
      modeloId: m.id,
      costoCompra: m.costoCompra !== null ? Dinero.pesos(m.costoCompra) : null,
      ingresosAcumulados: Dinero.pesos(ingresosPorModelo.get(m.id) ?? 0),
    }));
  }
}
