import { Dinero } from "@toolboxjl/shared-types";
import { PricingCalculatorService } from "./pricing-calculator.service";

describe("PricingCalculatorService", () => {
  let service: PricingCalculatorService;

  beforeEach(() => {
    service = new PricingCalculatorService();
  });

  describe("alquiler", () => {
    it("calcula tarifa diaria para pocos días (dias < 7)", () => {
      const tarifaDia = Dinero.pesos(10000);
      const tarifaSemana = Dinero.pesos(60000);
      const input = {
        tipo: "alquiler" as const,
        tarifaDia,
        tarifaSemana,
        depositoPct: 0.2,
        dias: 3,
        costoCompra: Dinero.cero(),
        pesoKg: 5,
        zonaId: "uuid-1",
        returnMode: "en_sede" as const,
      };

      const result = service.calcular(input);

      expect(result.tarifa_base).toBe(30000); // 3 * 10000
      expect(result.recargo_logistico).toBe(2500); // 5 * 500
      expect(result.deposito_garantia).toBe(6000); // 30000 * 0.2
      expect(result.total).toBe(38500); // 30000 + 2500 + 6000
      expect(result.desglose).toEqual([
        { concepto: "Tarifa base", monto: 30000 },
        { concepto: "Recargo logístico", monto: 2500 },
        { concepto: "Depósito de garantía", monto: 6000 },
      ]);
    });

    it("calcula tarifa semanal completa (dias = 7)", () => {
      const tarifaDia = Dinero.pesos(10000);
      const tarifaSemana = Dinero.pesos(60000);
      const input = {
        tipo: "alquiler" as const,
        tarifaDia,
        tarifaSemana,
        depositoPct: 0.1,
        dias: 7,
        costoCompra: Dinero.cero(),
        pesoKg: 0,
        zonaId: "uuid-2",
        returnMode: "en_sede" as const,
      };

      const result = service.calcular(input);

      expect(result.tarifa_base).toBe(60000); // 1 semana
      expect(result.recargo_logistico).toBe(0);
      expect(result.deposito_garantia).toBe(6000); // 60000 * 0.1
      expect(result.total).toBe(66000);
    });

    it("calcula alquiler mixto (semana + días sueltos)", () => {
      const tarifaDia = Dinero.pesos(10000);
      const tarifaSemana = Dinero.pesos(60000);
      const input = {
        tipo: "alquiler" as const,
        tarifaDia,
        tarifaSemana,
        depositoPct: 0.2,
        dias: 10, // 1 semana + 3 días
        costoCompra: Dinero.cero(),
        pesoKg: 2,
        zonaId: "uuid-3",
        returnMode: "en_sede" as const,
      };

      const result = service.calcular(input);

      expect(result.tarifa_base).toBe(90000); // 60000 + 3*10000
      expect(result.recargo_logistico).toBe(1000); // 2 * 500
      expect(result.deposito_garantia).toBe(18000); // 90000 * 0.2
      expect(result.total).toBe(109000);
    });
  });

  describe("venta", () => {
    it("usa costo de compra como tarifa base, sin recargo ni depósito", () => {
      const costoCompra = Dinero.pesos(250000);
      const input = {
        tipo: "venta" as const,
        tarifaDia: Dinero.cero(),
        tarifaSemana: Dinero.cero(),
        depositoPct: 0.2, // no debería usarse
        dias: 0,
        costoCompra,
        pesoKg: 10,
        zonaId: "uuid-4",
        returnMode: "en_sede" as const,
      };

      const result = service.calcular(input);

      expect(result.tarifa_base).toBe(250000);
      expect(result.recargo_logistico).toBe(0);
      expect(result.deposito_garantia).toBe(0);
      expect(result.total).toBe(250000);
      expect(result.desglose).toEqual([
        { concepto: "Tarifa base", monto: 250000 },
        { concepto: "Recargo logístico", monto: 0 },
      ]);
    });
  });

  describe("modalidad de entrega/recogida (RF-3.2, HU-4.3)", () => {
    it("recargo en su valor base cuando return_mode es en_sede (un solo viaje)", () => {
      const input = {
        tipo: "alquiler" as const,
        tarifaDia: Dinero.pesos(10000),
        tarifaSemana: Dinero.pesos(60000),
        depositoPct: 0.2,
        dias: 3,
        costoCompra: Dinero.cero(),
        pesoKg: 4,
        zonaId: "uuid-6",
        returnMode: "en_sede" as const,
      };

      const result = service.calcular(input);

      expect(result.recargo_logistico).toBe(2000); // 4 * 500, un solo viaje
    });

    it("recargo se duplica cuando return_mode es recogida_domicilio (dos viajes)", () => {
      const input = {
        tipo: "alquiler" as const,
        tarifaDia: Dinero.pesos(10000),
        tarifaSemana: Dinero.pesos(60000),
        depositoPct: 0.2,
        dias: 3,
        costoCompra: Dinero.cero(),
        pesoKg: 4,
        zonaId: "uuid-7",
        returnMode: "recogida_domicilio" as const,
      };

      const result = service.calcular(input);

      expect(result.recargo_logistico).toBe(4000); // 4 * 500 * 2, entrega + recogida
    });

    it("el recargo por kg es configurable vía el constructor (RECARGO_LOGISTICO_POR_KG_COP)", () => {
      const servicioConfigurado = new PricingCalculatorService(1000);
      const input = {
        tipo: "alquiler" as const,
        tarifaDia: Dinero.pesos(10000),
        tarifaSemana: Dinero.pesos(60000),
        depositoPct: 0.2,
        dias: 3,
        costoCompra: Dinero.cero(),
        pesoKg: 4,
        zonaId: "uuid-8",
        returnMode: "en_sede" as const,
      };

      const result = servicioConfigurado.calcular(input);

      expect(result.recargo_logistico).toBe(4000); // 4 * 1000
    });
  });

  it("nunca usa number flotante para montos (todo pasa por Dinero)", () => {
    const tarifaDia = Dinero.pesos(10000);
    const tarifaSemana = Dinero.pesos(60000);
    const input = {
      tipo: "alquiler" as const,
      tarifaDia,
      tarifaSemana,
      depositoPct: 0.2,
      dias: 3,
      costoCompra: Dinero.cero(),
      pesoKg: 5,
      zonaId: "uuid-5",
      returnMode: "en_sede" as const,
    };

    const result = service.calcular(input);

    // Todos los montos son enteros
    expect(Number.isInteger(result.tarifa_base)).toBe(true);
    expect(Number.isInteger(result.recargo_logistico)).toBe(true);
    expect(Number.isInteger(result.deposito_garantia)).toBe(true);
    expect(Number.isInteger(result.total)).toBe(true);
    result.desglose.forEach((item) => {
      expect(Number.isInteger(item.monto)).toBe(true);
    });
  });
});
