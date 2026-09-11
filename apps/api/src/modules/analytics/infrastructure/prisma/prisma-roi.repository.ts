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

    // Ver domain/roi.repository.ts: cada Payment se prorratea entre TODOS
    // los modelos de su Order, proporcional al tarifaAplicada de cada ítem
    // (antes se atribuía entero al primer OrderItem — exacto solo mientras
    // toda orden tenía 1 solo ítem).
    const pagos = await this.prisma.payment.findMany({
      where: {
        estado: "capturado",
        tipo: { in: [...TIPOS_INGRESO] },
        ...(modeloId ? { order: { items: { some: { unidad: { modeloId } } } } } : {}),
      },
      select: {
        monto: true,
        order: {
          select: {
            items: { select: { tarifaAplicada: true, unidad: { select: { modeloId: true } } } },
          },
        },
      },
    });

    const ingresosPorModelo = new Map<string, number>();
    for (const pago of pagos) {
      const items = pago.order.items;
      if (items.length === 0) {
        continue;
      }
      const tarifaTotal = items.reduce((suma, item) => suma + item.tarifaAplicada, 0);
      for (const item of items) {
        // Peso proporcional a la tarifa del ítem; si tarifaTotal es 0
        // (caso degenerado, ej. todas las tarifas en 0), se reparte el pago
        // en partes iguales entre los ítems en vez de dividir por 0.
        const peso = tarifaTotal > 0 ? item.tarifaAplicada / tarifaTotal : 1 / items.length;
        const mId = item.unidad.modeloId;
        ingresosPorModelo.set(mId, (ingresosPorModelo.get(mId) ?? 0) + pago.monto * peso);
      }
    }

    return modelos.map((m) => ({
      modeloId: m.id,
      costoCompra: m.costoCompra !== null ? Dinero.pesos(m.costoCompra) : null,
      // Math.round: el prorrateo por peso puede dejar centavos fraccionarios
      // (Dinero.pesos exige enteros) — se redondea recién acá, al final de
      // sumar todos los pagos de este modelo, para no arrastrar error de
      // redondeo pago-por-pago.
      ingresosAcumulados: Dinero.pesos(Math.round(ingresosPorModelo.get(m.id) ?? 0)),
    }));
  }
}
