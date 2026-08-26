import { diasEnRango, mesActualUtc } from "./mes-actual";

describe("mesActualUtc", () => {
  it("devuelve [desde, hasta) del mes calendario en UTC, sin importar el día/hora de 'ahora'", () => {
    const rango = mesActualUtc(new Date("2026-08-17T23:45:00.000Z"));
    expect(rango.desde.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(rango.hasta.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("cruza correctamente el límite de año (diciembre -> enero)", () => {
    const rango = mesActualUtc(new Date("2026-12-05T00:00:00.000Z"));
    expect(rango.desde.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(rango.hasta.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("diasEnRango", () => {
  it("cuenta los días completos entre dos fechas UTC", () => {
    expect(diasEnRango(new Date("2026-08-01T00:00:00.000Z"), new Date("2026-08-10T00:00:00.000Z"))).toBe(9);
  });

  it("devuelve 0 (nunca negativo) si hasta <= desde", () => {
    expect(diasEnRango(new Date("2026-08-10T00:00:00.000Z"), new Date("2026-08-01T00:00:00.000Z"))).toBe(0);
    expect(diasEnRango(new Date("2026-08-10T00:00:00.000Z"), new Date("2026-08-10T00:00:00.000Z"))).toBe(0);
  });
});
