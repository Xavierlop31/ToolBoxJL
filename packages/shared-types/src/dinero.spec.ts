import { Dinero } from "./dinero";

describe("Dinero", () => {
  describe("pesos", () => {
    it("crea un Dinero a partir de un entero no negativo", () => {
      expect(Dinero.pesos(150000).valor).toBe(150000);
      expect(Dinero.pesos(0).valor).toBe(0);
    });

    it("lanza si el monto no es entero", () => {
      expect(() => Dinero.pesos(100.5)).toThrow(/enteros/);
    });

    it("lanza si el monto es negativo", () => {
      expect(() => Dinero.pesos(-1)).toThrow(/negativos/);
    });
  });

  it("cero() devuelve un Dinero con valor 0", () => {
    expect(Dinero.cero().valor).toBe(0);
  });

  describe("sumar", () => {
    it("suma dos montos", () => {
      const resultado = Dinero.pesos(100000).sumar(Dinero.pesos(50000));
      expect(resultado.valor).toBe(150000);
    });
  });

  describe("restar", () => {
    it("resta dos montos", () => {
      const resultado = Dinero.pesos(100000).restar(Dinero.pesos(30000));
      expect(resultado.valor).toBe(70000);
    });

    it("lanza si el resultado sería negativo", () => {
      expect(() => Dinero.pesos(100).restar(Dinero.pesos(200))).toThrow(
        /negativos/,
      );
    });
  });

  describe("multiplicarPor", () => {
    it("aplica un factor (ej. depósito 20%) y redondea al peso entero", () => {
      const resultado = Dinero.pesos(150000).multiplicarPor(0.2);
      expect(resultado.valor).toBe(30000);
    });

    it("redondea resultados fraccionarios", () => {
      const resultado = Dinero.pesos(100).multiplicarPor(1 / 3);
      expect(resultado.valor).toBe(33);
    });

    it("lanza con un factor negativo", () => {
      expect(() => Dinero.pesos(100).multiplicarPor(-1)).toThrow(/inválido/);
    });
  });

  describe("comparaciones", () => {
    it("esMayorQue compara montos", () => {
      expect(Dinero.pesos(200).esMayorQue(Dinero.pesos(100))).toBe(true);
      expect(Dinero.pesos(100).esMayorQue(Dinero.pesos(200))).toBe(false);
    });

    it("equals compara igualdad por valor", () => {
      expect(Dinero.pesos(100).equals(Dinero.pesos(100))).toBe(true);
      expect(Dinero.pesos(100).equals(Dinero.pesos(101))).toBe(false);
    });
  });

  describe("toString", () => {
    it("formatea con separador de miles en formato es-CO", () => {
      expect(Dinero.pesos(150000).toString()).toBe("$ 150.000");
    });
  });
});
