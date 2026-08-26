import type { ToolModel } from "@toolboxjl/shared-types";
import { calcularSubtotalLinea, calcularTotalCarrito } from "./cart-pricing.service";
import type { CartLineItem } from "./cart.repository";

function modelo(overrides: Partial<ToolModel> = {}): ToolModel {
  return {
    id: "modelo-1",
    nombre: "Taladro Percutor",
    marca: "Bosch",
    categoria: "Taladros",
    tarifa_dia: 10_000,
    tarifa_semana: 60_000,
    costo_compra: 250_000,
    disponible_para_venta: true,
    ...overrides,
  };
}

describe("cart-pricing.service", () => {
  describe("calcularSubtotalLinea", () => {
    it("cotiza una línea de alquiler (dias < 7) con tarifa_dia * dias * cantidad", () => {
      const item: CartLineItem = { modelo_id: "modelo-1", cantidad: 2, dias: 3 };
      expect(calcularSubtotalLinea(modelo(), item)).toBe(2 * (3 * 10_000)); // 60_000
    });

    it("cotiza una línea de alquiler (dias >= 7) usando bloques de tarifa_semana + días sueltos", () => {
      const item: CartLineItem = { modelo_id: "modelo-1", cantidad: 1, dias: 9 };
      // 1 semana (60_000) + 2 días sueltos (2 * 10_000) = 80_000
      expect(calcularSubtotalLinea(modelo(), item)).toBe(80_000);
    });

    it("cae a tarifa_dia * 7 como tarifa_semana implícita si el modelo no tiene tarifa_semana", () => {
      const item: CartLineItem = { modelo_id: "modelo-1", cantidad: 1, dias: 7 };
      expect(calcularSubtotalLinea(modelo({ tarifa_semana: null }), item)).toBe(70_000);
    });

    it("cotiza una línea de venta (sin dias) con costo_compra * cantidad", () => {
      const item: CartLineItem = { modelo_id: "modelo-1", cantidad: 3, dias: null };
      expect(calcularSubtotalLinea(modelo(), item)).toBe(3 * 250_000);
    });

    it("cae a tarifa_dia como aproximación de venta si el modelo no tiene costo_compra", () => {
      const item: CartLineItem = { modelo_id: "modelo-1", cantidad: 2, dias: null };
      expect(calcularSubtotalLinea(modelo({ costo_compra: null }), item)).toBe(2 * 10_000);
    });
  });

  describe("calcularTotalCarrito", () => {
    it("suma el subtotal de todas las líneas cuyo modelo se puede resolver", () => {
      const items: CartLineItem[] = [
        { modelo_id: "modelo-1", cantidad: 1, dias: 3 }, // alquiler: 30_000
        { modelo_id: "modelo-2", cantidad: 1, dias: null }, // venta: 100_000
      ];
      const modelosPorId = new Map<string, ToolModel>([
        ["modelo-1", modelo({ id: "modelo-1" })],
        ["modelo-2", modelo({ id: "modelo-2", costo_compra: 100_000 })],
      ]);

      expect(calcularTotalCarrito(items, modelosPorId)).toBe(130_000);
    });

    it("ignora silenciosamente una línea cuyo modelo no está en el mapa", () => {
      const items: CartLineItem[] = [{ modelo_id: "no-existe", cantidad: 1, dias: null }];
      expect(calcularTotalCarrito(items, new Map())).toBe(0);
    });

    it("devuelve 0 para un carrito vacío", () => {
      expect(calcularTotalCarrito([], new Map())).toBe(0);
    });
  });
});
