import { calcularMora } from "./mora-calculator";

describe("calcularMora", () => {
  it("calcula días de retraso redondeando hacia arriba y el monto de mora", () => {
    const fechaFin = new Date("2026-08-20T00:00:00.000Z");
    const ahora = new Date("2026-08-23T12:00:00.000Z"); // 3.5 días de diferencia

    const resultado = calcularMora(45000, 0.05, fechaFin, ahora);

    // Math.ceil(3.5) = 4 días de retraso
    expect(resultado.diasRetraso).toBe(4);
    // 45000 * 0.05 * 4 = 9000
    expect(resultado.montoMora).toBe(9000);
  });

  it("no genera días de retraso negativos si 'ahora' es anterior a fechaFin", () => {
    const fechaFin = new Date("2026-08-25T00:00:00.000Z");
    const ahora = new Date("2026-08-20T00:00:00.000Z");

    const resultado = calcularMora(45000, 0.05, fechaFin, ahora);

    expect(resultado.diasRetraso).toBe(0);
    expect(resultado.montoMora).toBe(0);
  });

  it("redondea el monto de mora al entero más cercano (COP)", () => {
    const fechaFin = new Date("2026-08-20T00:00:00.000Z");
    const ahora = new Date("2026-08-21T00:00:00.000Z"); // 1 día

    const resultado = calcularMora(33333, 0.05, fechaFin, ahora);

    // 33333 * 0.05 * 1 = 1666.65 -> redondeado 1667
    expect(resultado.diasRetraso).toBe(1);
    expect(resultado.montoMora).toBe(1667);
  });
});
