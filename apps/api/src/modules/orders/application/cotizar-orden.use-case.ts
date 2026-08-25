import { Inject, Injectable, BadRequestException } from "@nestjs/common";
import { TOOL_MODEL_REPOSITORY } from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { PricingCalculatorService, type QuoteResult } from "../../pricing/domain/pricing-calculator.service";
import { Dinero } from "@toolboxjl/shared-types";

export interface CotizarOrdenInput {
  modeloId: string;
  tipo: "alquiler" | "venta";
  fechaInicio?: string;
  fechaFin?: string;
  zonaId: string;
}

@Injectable()
export class CotizarOrdenUseCase {
  private readonly pricingCalculator = new PricingCalculatorService();

  constructor(
    @Inject(TOOL_MODEL_REPOSITORY)
    private readonly modelos: ToolModelRepository,
  ) {}

  async ejecutar(input: CotizarOrdenInput): Promise<QuoteResult> {
    const modelo = await this.modelos.buscarPorId(input.modeloId);
    if (!modelo) {
      throw new ModeloNoEncontradoError(input.modeloId);
    }

    let dias = 0;
    if (input.tipo === "alquiler") {
      if (!input.fechaInicio || !input.fechaFin) {
        throw new BadRequestException("Las fechas de inicio y fin son requeridas para alquiler.");
      }
      const inicio = new Date(input.fechaInicio);
      const fin = new Date(input.fechaFin);
      const diffTime = fin.getTime() - inicio.getTime();
      dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (dias <= 0) {
        throw new BadRequestException("La fecha de fin debe ser posterior a la fecha de inicio.");
      }
    }

    const quote = this.pricingCalculator.calcular({
      tipo: input.tipo,
      tarifaDia: Dinero.pesos(modelo.tarifa_dia),
      tarifaSemana: Dinero.pesos(modelo.tarifa_semana ?? modelo.tarifa_dia * 7),
      depositoPct: modelo.deposito_pct ?? 0,
      dias,
      costoCompra: Dinero.pesos(modelo.costo_compra ?? 0),
      pesoKg: modelo.peso_kg ?? 0,
      zonaId: input.zonaId,
    });

    quote.modelo_id = input.modeloId;
    return quote;
  }
}
