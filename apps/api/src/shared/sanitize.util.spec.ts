import { plainToInstance } from "class-transformer";
import { IsString } from "class-validator";
import { SanitizarTextoLibre, sanitizarTextoLibre } from "./sanitize.util";

describe("sanitizarTextoLibre", () => {
  it("recorta espacios en los extremos", () => {
    expect(sanitizarTextoLibre("  Taladro  ")).toBe("Taladro");
  });

  it("elimina tags HTML sin dejar restos", () => {
    expect(sanitizarTextoLibre('<script>alert("xss")</script>Bosch')).toBe(
      'alert("xss")Bosch',
    );
    expect(sanitizarTextoLibre('<img src=x onerror=alert(1)>Taladro')).toBe(
      "Taladro",
    );
  });

  it("elimina caracteres de control pero preserva saltos de línea", () => {
    const conControl = "Falla\x00detectada\x1Fen motor\nSegunda línea";
    expect(sanitizarTextoLibre(conControl)).toBe(
      "Falladetectadaen motor\nSegunda línea",
    );
  });

  it("no toca valores que no son string (deja que class-validator reporte el error de tipo)", () => {
    expect(sanitizarTextoLibre(42)).toBe(42);
    expect(sanitizarTextoLibre(undefined)).toBeUndefined();
    expect(sanitizarTextoLibre(null)).toBeNull();
  });
});

describe("SanitizarTextoLibre (decorator @Transform)", () => {
  class DtoDePrueba {
    @IsString()
    @SanitizarTextoLibre()
    nombre!: string;
  }

  it("sanitiza el valor durante plainToInstance, antes de que corra class-validator", () => {
    const instancia = plainToInstance(DtoDePrueba, {
      nombre: '  <b>Martillo</b> demoledor  ',
    });
    expect(instancia.nombre).toBe("Martillo demoledor");
  });
});
