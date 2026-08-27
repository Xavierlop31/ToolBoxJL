import { EstadoUnidad as PrismaEstadoUnidad } from "@prisma/client";
import type { EstadoUnidad } from "@toolboxjl/shared-types";
import { estadoADominio, estadoAPrisma } from "./estado-unidad.mapper";

describe("estado-unidad.mapper", () => {
  describe("estadoADominio", () => {
    it.each([
      [PrismaEstadoUnidad.Nuevo, "Nuevo"],
      [PrismaEstadoUnidad.Excelente, "Excelente"],
      [PrismaEstadoUnidad.Operativo, "Operativo"],
      [PrismaEstadoUnidad.EnMantenimiento, "En Mantenimiento"],
      [PrismaEstadoUnidad.DadoDeBaja, "Dado de Baja"],
    ] as const)("mapea %s -> %s", (valorPrisma, esperado) => {
      expect(estadoADominio(valorPrisma)).toBe(esperado);
    });

    it("lanza un Error si recibe un valor no reconocido", () => {
      expect(() => estadoADominio("Inexistente" as PrismaEstadoUnidad)).toThrow(
        /no reconocido/,
      );
    });
  });

  describe("estadoAPrisma", () => {
    it.each([
      ["Nuevo", PrismaEstadoUnidad.Nuevo],
      ["Excelente", PrismaEstadoUnidad.Excelente],
      ["Operativo", PrismaEstadoUnidad.Operativo],
      ["En Mantenimiento", PrismaEstadoUnidad.EnMantenimiento],
      ["Dado de Baja", PrismaEstadoUnidad.DadoDeBaja],
    ] as const)("mapea %s -> %s", (valorDominio, esperado) => {
      expect(estadoAPrisma(valorDominio)).toBe(esperado);
    });

    it("lanza un Error si recibe un valor no reconocido", () => {
      expect(() => estadoAPrisma("Inexistente" as EstadoUnidad)).toThrow(/no reconocido/);
    });
  });
});
