import { AccesoDenegadoError } from "./errors/acceso-denegado.error";
import { PoliticaAccesoService } from "./politica-acceso.service";

describe("PoliticaAccesoService", () => {
  const politica = new PoliticaAccesoService();

  describe("tieneAcceso", () => {
    it("permite acceso cuando no hay roles restringidos (solo requiere autenticación)", () => {
      expect(politica.tieneAcceso("cliente", [])).toBe(true);
    });

    it("permite acceso cuando el rol del usuario está en la lista permitida", () => {
      expect(politica.tieneAcceso("admin", ["admin", "gerente"])).toBe(true);
    });

    it("deniega acceso cuando el rol del usuario no está en la lista permitida", () => {
      expect(politica.tieneAcceso("cliente", ["admin", "gerente"])).toBe(
        false,
      );
    });

    it.each([
      "admin",
      "gerente",
      "almacenista",
      "repartidor",
      "cliente",
    ] as const)("respeta exactamente el rol %s en una lista de un solo rol", (rol) => {
      expect(politica.tieneAcceso(rol, [rol])).toBe(true);
    });
  });

  describe("verificarAcceso", () => {
    it("no lanza cuando hay acceso", () => {
      expect(() =>
        politica.verificarAcceso("almacenista", ["almacenista", "repartidor"]),
      ).not.toThrow();
    });

    it("lanza AccesoDenegadoError con el rol y los roles permitidos cuando no hay acceso", () => {
      expect(() =>
        politica.verificarAcceso("cliente", ["admin"]),
      ).toThrow(AccesoDenegadoError);

      try {
        politica.verificarAcceso("cliente", ["admin", "gerente"]);
        fail("debía lanzar");
      } catch (error) {
        expect(error).toBeInstanceOf(AccesoDenegadoError);
        const accesoDenegado = error as AccesoDenegadoError;
        expect(accesoDenegado.rolUsuario).toBe("cliente");
        expect(accesoDenegado.rolesPermitidos).toEqual(["admin", "gerente"]);
      }
    });
  });
});
