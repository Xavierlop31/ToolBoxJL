import { Injectable } from "@nestjs/common";
import { Dinero } from "@toolboxjl/shared-types";
import type { TipoPago, EstadoPago } from "@toolboxjl/shared-types";
import type { IngresosPorTipo, RangoPeriodo, RevenueRepository } from "../../domain/revenue.repository";

/**
 * Registro mínimo necesario para agregar ingresos — deliberadamente más
 * angosto que el `Payment` de dominio (que no expone `created_at`, ver
 * doc-comment de `RevenueRepository`). Los tests/BDD siembran estos
 * registros directamente con `registrarPago` (no hay, en este sprint, un
 * flujo de otro caso de uso que produzca pagos con fecha controlable).
 */
export interface PagoRegistradoParaAnalitica {
  tipo: TipoPago;
  estado: EstadoPago;
  monto: number;
  createdAt: Date;
}

@Injectable()
export class InMemoryRevenueRepository implements RevenueRepository {
  private readonly pagos: PagoRegistradoParaAnalitica[] = [];

  registrarPago(pago: PagoRegistradoParaAnalitica): void {
    this.pagos.push(pago);
  }

  limpiar(): void {
    this.pagos.length = 0;
  }

  async sumarPorTipo(rango: RangoPeriodo | null): Promise<IngresosPorTipo> {
    const enRango = this.pagos.filter(
      (p) => !rango || (p.createdAt >= rango.desde && p.createdAt < rango.hasta),
    );

    const sumarTipo = (tipo: TipoPago) =>
      enRango
        .filter((p) => p.tipo === tipo && p.estado === "capturado")
        .reduce((acc, p) => acc.sumar(Dinero.pesos(p.monto)), Dinero.cero());

    return {
      ventasDirectas: sumarTipo("pago_venta"),
      tarifasAlquiler: sumarTipo("pago_alquiler"),
      cobrosMora: sumarTipo("cobro_mora"),
    };
  }
}
