import { generarCodigoOtp } from "./otp-codigo";

describe("generarCodigoOtp", () => {
  it("genera siempre 6 dígitos, con ceros a la izquierda si hace falta", () => {
    for (let i = 0; i < 200; i++) {
      const codigo = generarCodigoOtp();
      expect(codigo).toMatch(/^\d{6}$/);
    }
  });
});
