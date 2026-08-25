import {
  loadOtpExpiracionMinutos,
  loadOtpRateLimitMaximo,
  loadOtpRateLimitVentanaMinutos,
  loadWhatsAppCredentials,
} from "./whatsapp.config";

describe("loadWhatsAppCredentials", () => {
  it("devuelve las 3 credenciales cuando están definidas", () => {
    const credenciales = loadWhatsAppCredentials({
      WHATSAPP_TOKEN: "token-de-prueba",
      WHATSAPP_PHONE_NUMBER_ID: "1234567890",
      WHATSAPP_BUSINESS_ACCOUNT_ID: "0987654321",
    } as NodeJS.ProcessEnv);

    expect(credenciales).toEqual({
      token: "token-de-prueba",
      phoneNumberId: "1234567890",
      businessAccountId: "0987654321",
    });
  });

  it("lanza con mensaje explícito si falta WHATSAPP_TOKEN", () => {
    expect(() =>
      loadWhatsAppCredentials({
        WHATSAPP_PHONE_NUMBER_ID: "1234567890",
        WHATSAPP_BUSINESS_ACCOUNT_ID: "0987654321",
      } as NodeJS.ProcessEnv),
    ).toThrow(/WHATSAPP_TOKEN/);
  });

  it("lanza si falta cualquiera de las 3 variables", () => {
    expect(() => loadWhatsAppCredentials({} as NodeJS.ProcessEnv)).toThrow();
  });
});

describe("loadOtpExpiracionMinutos", () => {
  it("usa 10 minutos como default", () => {
    expect(loadOtpExpiracionMinutos({} as NodeJS.ProcessEnv)).toBe(10);
  });

  it("respeta el valor configurado", () => {
    expect(loadOtpExpiracionMinutos({ OTP_EXPIRACION_MINUTOS: "5" } as NodeJS.ProcessEnv)).toBe(5);
  });

  it("lanza si el valor no es un entero positivo", () => {
    expect(() =>
      loadOtpExpiracionMinutos({ OTP_EXPIRACION_MINUTOS: "0" } as NodeJS.ProcessEnv),
    ).toThrow();
    expect(() =>
      loadOtpExpiracionMinutos({ OTP_EXPIRACION_MINUTOS: "abc" } as NodeJS.ProcessEnv),
    ).toThrow();
  });
});

describe("loadOtpRateLimitMaximo", () => {
  it("usa 3 como default", () => {
    expect(loadOtpRateLimitMaximo({} as NodeJS.ProcessEnv)).toBe(3);
  });

  it("respeta el valor configurado", () => {
    expect(loadOtpRateLimitMaximo({ OTP_RATE_LIMIT_MAXIMO: "5" } as NodeJS.ProcessEnv)).toBe(5);
  });
});

describe("loadOtpRateLimitVentanaMinutos", () => {
  it("usa 15 minutos como default", () => {
    expect(loadOtpRateLimitVentanaMinutos({} as NodeJS.ProcessEnv)).toBe(15);
  });

  it("respeta el valor configurado", () => {
    expect(
      loadOtpRateLimitVentanaMinutos({ OTP_RATE_LIMIT_VENTANA_MINUTOS: "30" } as NodeJS.ProcessEnv),
    ).toBe(30);
  });
});
