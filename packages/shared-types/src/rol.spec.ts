import { ROLES, ROLES_HUMANOS, asegurarRol, esRolValido } from "./rol";

describe("Rol", () => {
  it("ROLES_HUMANOS expone exactamente los 5 roles humanos de docs/DESIGN.md §4.1", () => {
    expect(ROLES_HUMANOS).toEqual([
      "admin",
      "gerente",
      "almacenista",
      "repartidor",
      "cliente",
    ]);
  });

  it("ROLES extiende ROLES_HUMANOS con los roles de servicio agente-1 (Sprint 7) y agente-2 (Sprint 8)", () => {
    expect(ROLES).toEqual([...ROLES_HUMANOS, "agente-1", "agente-2"]);
  });

  describe("esRolValido", () => {
    it.each(ROLES)("acepta el rol conocido %s", (rol) => {
      expect(esRolValido(rol)).toBe(true);
    });

    it("rechaza strings que no son roles", () => {
      expect(esRolValido("superadmin")).toBe(false);
    });

    it("rechaza valores no-string", () => {
      expect(esRolValido(undefined)).toBe(false);
      expect(esRolValido(null)).toBe(false);
      expect(esRolValido(42)).toBe(false);
      expect(esRolValido({ rol: "admin" })).toBe(false);
    });
  });

  describe("asegurarRol", () => {
    it("devuelve el rol cuando es válido", () => {
      expect(asegurarRol("gerente")).toBe("gerente");
    });

    it("lanza con un mensaje explícito cuando el rol es inválido", () => {
      expect(() => asegurarRol("root")).toThrow(/Rol inválido: "root"/);
    });

    it("lanza cuando el valor es undefined (claim ausente)", () => {
      expect(() => asegurarRol(undefined)).toThrow(/Rol inválido/);
    });
  });
});
