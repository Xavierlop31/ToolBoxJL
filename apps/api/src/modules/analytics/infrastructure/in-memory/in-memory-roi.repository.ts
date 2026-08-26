import { Injectable } from "@nestjs/common";
import { Dinero } from "@toolboxjl/shared-types";
import type { ModeloConIngresos, RoiRepository } from "../../domain/roi.repository";

/**
 * Registro mínimo sembrado directamente por tests/BDD — mismo criterio que
 * `PagoRegistradoParaAnalitica` (`in-memory-revenue.repository.ts`): más
 * angosto que componer `ToolModelRepository`/`OrderRepository`/
 * `PaymentRepository` en memoria (que obligaría a sembrar `Order`+
 * `OrderItem`+`ToolUnit`+`Payment` completos solo para ejercitar la fórmula
 * de ROI).
 */
export interface ModeloSembradoParaRoi {
  modeloId: string;
  costoCompra: number | null;
  ingresosAcumulados: number;
}

@Injectable()
export class InMemoryRoiRepository implements RoiRepository {
  private readonly modelos: ModeloSembradoParaRoi[] = [];

  sembrar(modelo: ModeloSembradoParaRoi): void {
    this.modelos.push(modelo);
  }

  limpiar(): void {
    this.modelos.length = 0;
  }

  async listarConIngresos(modeloId?: string): Promise<ModeloConIngresos[]> {
    const filtrados = modeloId
      ? this.modelos.filter((m) => m.modeloId === modeloId)
      : this.modelos;

    return filtrados.map((m) => ({
      modeloId: m.modeloId,
      costoCompra: m.costoCompra !== null ? Dinero.pesos(m.costoCompra) : null,
      ingresosAcumulados: Dinero.pesos(m.ingresosAcumulados),
    }));
  }
}
