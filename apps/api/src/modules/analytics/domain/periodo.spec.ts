import { parsearPeriodo } from "./periodo";
import { PeriodoInvalidoError } from "./errors/periodo-invalido.error";

describe("parsearPeriodo", () => {
  it("devuelve null si no se pasa periodo", () => {
    expect(parsearPeriodo(undefined)).toBeNull();
    expect(parsearPeriodo(null)).toBeNull();
    expect(parsearPeriodo("")).toBeNull();
  });

  it("parsea 'YYYY-MM' como el mes calendario completo en UTC", () => {
    const rango = parsearPeriodo("2026-08");
    expect(rango).not.toBeNull();
    expect(rango!.desde.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(rango!.hasta.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("parsea un rango 'fecha/fecha' incluyendo el día final completo", () => {
    const rango = parsearPeriodo("2026-08-01/2026-08-15");
    expect(rango!.desde.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    // El límite superior es exclusivo: se corre al día SIGUIENTE al 15 para
    // que el 15 completo quede incluido.
    expect(rango!.hasta.toISOString()).toBe("2026-08-16T00:00:00.000Z");
  });

  it("parsea un rango 'datetime/datetime' ISO completo tal cual", () => {
    const rango = parsearPeriodo("2026-08-01T10:00:00.000Z/2026-08-15T18:30:00.000Z");
    expect(rango!.desde.toISOString()).toBe("2026-08-01T10:00:00.000Z");
    expect(rango!.hasta.toISOString()).toBe("2026-08-15T18:30:00.000Z");
  });

  it("lanza PeriodoInvalidoError para un mes fuera de rango", () => {
    expect(() => parsearPeriodo("2026-13")).toThrow(PeriodoInvalidoError);
  });

  it("lanza PeriodoInvalidoError para un rango invertido (fin antes que inicio)", () => {
    expect(() => parsearPeriodo("2026-08-15/2026-08-01")).toThrow(PeriodoInvalidoError);
  });

  it("lanza PeriodoInvalidoError para un formato no reconocido", () => {
    expect(() => parsearPeriodo("no-es-un-periodo")).toThrow(PeriodoInvalidoError);
  });
});
