import { Zona } from "./zona";

describe("Zona", () => {
  it("crea una Zona válida con id y nombre", () => {
    const zona = Zona.create({ id: "z-1", nombre: "Bogotá — Norte" });
    expect(zona.id).toBe("z-1");
    expect(zona.nombre).toBe("Bogotá — Norte");
  });

  it("recorta espacios en id y nombre", () => {
    const zona = Zona.create({ id: "  z-1  ", nombre: "  Sur  " });
    expect(zona.id).toBe("z-1");
    expect(zona.nombre).toBe("Sur");
  });

  it("lanza si el id está vacío", () => {
    expect(() => Zona.create({ id: "", nombre: "Norte" })).toThrow(/id/);
  });

  it("lanza si el nombre está vacío", () => {
    expect(() => Zona.create({ id: "z-1", nombre: "   " })).toThrow(/nombre/);
  });

  describe("equals", () => {
    it("compara por id, no por nombre", () => {
      const a = Zona.create({ id: "z-1", nombre: "Norte" });
      const b = Zona.create({ id: "z-1", nombre: "Norte (renombrada)" });
      const c = Zona.create({ id: "z-2", nombre: "Norte" });
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });
  });
});
