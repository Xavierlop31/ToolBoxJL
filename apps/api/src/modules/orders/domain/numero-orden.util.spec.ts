import { formatearNumeroOrden } from "./numero-orden.util";

describe("formatearNumeroOrden", () => {
  it("rellena con ceros a la izquierda hasta 7 dígitos", () => {
    expect(formatearNumeroOrden(1)).toBe("TJL0000001");
  });

  it("no trunca cuando la secuencia ya tiene 7 o más dígitos", () => {
    expect(formatearNumeroOrden(1_234_567)).toBe("TJL1234567");
    expect(formatearNumeroOrden(12_345_678)).toBe("TJL12345678");
  });
});
