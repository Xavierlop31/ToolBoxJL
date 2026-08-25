import { Dinero, type ModoRetorno } from "@toolboxjl/shared-types";

export type TipoCotizacion = "alquiler" | "venta";

export interface PricingCalculatorInput {
  tipo: TipoCotizacion;
  tarifaDia: Dinero;
  tarifaSemana: Dinero;
  depositoPct: number; // ej. 0.2 = 20%
  dias: number; // solo relevante para alquiler
  costoCompra: Dinero; // solo relevante para venta
  pesoKg: number;
  zonaId: string; // uuid, aún no afecta el cálculo
  /**
   * Modalidad de entrega/recogida (RF-3.2, HU-4.3). Determina si el recargo
   * logístico cubre uno o dos viajes — ver `calcularRecargoLogistico`.
   */
  returnMode: ModoRetorno;
}

export interface DesgloseItem {
  concepto: string;
  monto: number; // COP entero
}

export interface QuoteResult {
  modelo_id: string; // no se usa en este servicio, se deja vacío o se omite
  tarifa_base: number;
  recargo_logistico: number;
  deposito_garantia: number;
  total: number;
  desglose: DesgloseItem[];
}

/**
 * Servicio de dominio puro para calcular cotizaciones (RF-2.1).
 * No depende de NestJS ni de infraestructura.
 *
 * Decisiones provisorias (documentadas para el equipo):
 * - Recargo logístico: configurable vía `recargoPorKg` (constructor), sin
 *   diferenciar por zona (zonaId se recibe pero no afecta el cálculo
 *   todavía). El default de $500 COP/kg abajo es el fallback cuando quien
 *   instancia este servicio no pasa un valor — quien SÍ necesita leer la env
 *   var `RECARGO_LOGISTICO_POR_KG_COP` (RF-3.2, HU-4.3) es la capa de
 *   aplicación (`CotizarOrdenUseCase`, ver
 *   `pricing/infrastructure/config/pricing.config.ts`), nunca este servicio
 *   de dominio directamente — mismo criterio de separación de capas que el
 *   resto de Clean Architecture en este repo.
 * - Modalidad (RF-3.2, HU-4.3): el recargo logístico se duplica cuando
 *   `returnMode === "recogida_domicilio"` (dos viajes logísticos: entrega +
 *   recogida a domicilio) y queda en su valor base cuando `"en_sede"` (un
 *   solo viaje; el cliente devuelve la herramienta él mismo).
 * - Venta: no se aplica recargo logístico (el envío se asume incluido o se maneja aparte) y no hay depósito de garantía (0).
 * - Alquiler: se optimiza usando bloques de semana (tarifaSemana) + días sueltos a tarifaDia. Si dias < 7, se usa solo tarifaDia * dias.
 * - Depósito de garantía: solo para alquiler, tarifaBase * depositoPct (redondeado con Dinero.multiplicarPor).
 */
export class PricingCalculatorService {
  private readonly recargoPorKg: Dinero;

  constructor(recargoPorKgCop: number = 500) {
    this.recargoPorKg = Dinero.pesos(recargoPorKgCop);
  }

  calcular(input: PricingCalculatorInput): QuoteResult {
    const { tipo, tarifaDia, tarifaSemana, depositoPct, dias, costoCompra, pesoKg, returnMode } = input;

    // 1. Tarifa base
    let tarifaBase: Dinero;
    if (tipo === "alquiler") {
      tarifaBase = this.calcularTarifaAlquiler(tarifaDia, tarifaSemana, dias);
    } else {
      // venta: costo de compra directo
      tarifaBase = costoCompra;
    }

    // 2. Recargo logístico
    let recargoLogistico: Dinero;
    if (tipo === "alquiler") {
      recargoLogistico = this.calcularRecargoLogistico(pesoKg, returnMode);
    } else {
      // venta: sin recargo (decisión documentada)
      recargoLogistico = Dinero.cero();
    }

    // 3. Depósito de garantía
    let depositoGarantia: Dinero;
    if (tipo === "alquiler") {
      depositoGarantia = tarifaBase.multiplicarPor(depositoPct);
    } else {
      // venta: sin depósito
      depositoGarantia = Dinero.cero();
    }

    // 4. Total
    const total = tarifaBase.sumar(recargoLogistico).sumar(depositoGarantia);

    // 5. Desglose
    const desglose: DesgloseItem[] = [
      { concepto: "Tarifa base", monto: tarifaBase.valor },
      { concepto: "Recargo logístico", monto: recargoLogistico.valor },
    ];
    if (tipo === "alquiler") {
      desglose.push({ concepto: "Depósito de garantía", monto: depositoGarantia.valor });
    }

    // 6. Resultado plano (snake_case según openapi.yaml)
    return {
      modelo_id: "", // no se usa en este servicio; se puede llenar en la capa de aplicación
      tarifa_base: tarifaBase.valor,
      recargo_logistico: recargoLogistico.valor,
      deposito_garantia: depositoGarantia.valor,
      total: total.valor,
      desglose,
    };
  }

  private calcularTarifaAlquiler(tarifaDia: Dinero, tarifaSemana: Dinero, dias: number): Dinero {
    if (dias < 0) {
      throw new Error("dias no puede ser negativo");
    }
    if (dias < 7) {
      return tarifaDia.multiplicarPor(dias);
    }

    const semanas = Math.floor(dias / 7);
    const diasSueltos = dias % 7;

    const totalSemanas = tarifaSemana.multiplicarPor(semanas);
    const totalDiasSueltos = tarifaDia.multiplicarPor(diasSueltos);

    return totalSemanas.sumar(totalDiasSueltos);
  }

  private calcularRecargoLogistico(pesoKg: number, returnMode: ModoRetorno): Dinero {
    if (pesoKg < 0) {
      throw new Error("pesoKg no puede ser negativo");
    }
    // recargoPorKg COP por kg, redondeado al peso entero (Dinero.multiplicarPor ya redondea).
    const base = this.recargoPorKg.multiplicarPor(pesoKg);
    // RF-3.2/HU-4.3: "recogida_domicilio" implica dos viajes logísticos
    // (entrega + recogida a domicilio) → se duplica el recargo base.
    return returnMode === "recogida_domicilio" ? base.multiplicarPor(2) : base;
  }
}
