import { Inject, Injectable, BadRequestException } from "@nestjs/common";
import { TOOL_MODEL_REPOSITORY } from "../../catalog-inventory/infrastructure/catalog-inventory.tokens";
import type { ToolModelRepository } from "../../catalog-inventory/domain/tool-model.repository";
import { ModeloNoEncontradoError } from "../../catalog-inventory/domain/errors/modelo-no-encontrado.error";
import { PricingCalculatorService, type QuoteResult } from "../../pricing/domain/pricing-calculator.service";
import { loadRecargoLogisticoPorKg } from "../../pricing/infrastructure/config/pricing.config";
import { Dinero, type ModoRetorno } from "@toolboxjl/shared-types";

export interface CotizarOrdenInput {
  modeloId: string;
  tipo: "alquiler" | "venta";
  fechaInicio?: string;
  fechaFin?: string;
  zonaId: string;
  /**
   * Modalidad de entrega/recogida (RF-3.2, HU-4.3) — determina si el recargo
   * logístico es simple o doble (ver PricingCalculatorService). Opcional
   * acá porque `POST /orders/quote` (openapi.yaml) no la recibe todavía en
   * el body — el cliente recién la elige al crear la orden
   * (`OrderInput.return_mode`, obligatorio ahí). Cuando no se provee, se
   * asume `"en_sede"` (el escenario más común y el que muestra el recargo
   * base en la cotización previa a la creación de la orden).
   */
  returnMode?: ModoRetorno;
}

@Injectable()
export class CotizarOrdenUseCase {
  private readonly pricingCalculator = new PricingCalculatorService(loadRecargoLogisticoPorKg());

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
      returnMode: input.returnMode ?? "en_sede",
    });

    quote.modelo_id = input.modeloId;
    return quote;
  }
}
