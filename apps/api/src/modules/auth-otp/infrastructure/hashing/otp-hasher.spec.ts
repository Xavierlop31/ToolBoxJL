import { hashCodigoOtp, verificarCodigoOtp } from "./otp-hasher";

describe("otp-hasher", () => {
  it("verifica correctamente un código contra su propio hash", () => {
    const hash = hashCodigoOtp("123456");
    expect(verificarCodigoOtp("123456", hash)).toBe(true);
  });

  it("rechaza un código incorrecto", () => {
    const hash = hashCodigoOtp("123456");
    expect(verificarCodigoOtp("654321", hash)).toBe(false);
  });

  it("nunca persiste el código en texto plano dentro del hash", () => {
    const hash = hashCodigoOtp("123456");
    expect(hash).not.toContain("123456");
  });

  it("genera un salt distinto en cada llamada (dos hashes del mismo código son distintos)", () => {
    const hash1 = hashCodigoOtp("123456");
    const hash2 = hashCodigoOtp("123456");
    expect(hash1).not.toBe(hash2);
    expect(verificarCodigoOtp("123456", hash1)).toBe(true);
    expect(verificarCodigoOtp("123456", hash2)).toBe(true);
  });

  it("rechaza un hash malformado sin lanzar", () => {
    expect(verificarCodigoOtp("123456", "no-tiene-el-formato-salt-hash")).toBe(false);
    expect(verificarCodigoOtp("123456", "")).toBe(false);
  });
});
