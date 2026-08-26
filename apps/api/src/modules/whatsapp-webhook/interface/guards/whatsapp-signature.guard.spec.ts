import { createHmac } from "node:crypto";
import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { WhatsAppSignatureGuard } from "./whatsapp-signature.guard";

function contextoCon(rawBody: Buffer, headerSignature?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        rawBody,
        headers: headerSignature ? { "x-hub-signature-256": headerSignature } : {},
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("WhatsAppSignatureGuard", () => {
  const ORIGINAL_ENV = process.env;
  let guard: WhatsAppSignatureGuard;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    guard = new WhatsAppSignatureGuard();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("rechaza con 401 si WHATSAPP_APP_SECRET no está configurada (bloqueo real, nunca modo abierto)", () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const body = Buffer.from("{}");

    expect(() => guard.canActivate(contextoCon(body, "sha256=cualquiera"))).toThrow(UnauthorizedException);
  });

  it("acepta un request con firma válida", () => {
    process.env.WHATSAPP_APP_SECRET = "secreto-de-prueba";
    const body = Buffer.from(JSON.stringify({ evento: "mensaje" }));
    const firma = `sha256=${createHmac("sha256", "secreto-de-prueba").update(body).digest("hex")}`;

    expect(guard.canActivate(contextoCon(body, firma))).toBe(true);
  });

  it("rechaza con 401 una firma inválida", () => {
    process.env.WHATSAPP_APP_SECRET = "secreto-de-prueba";
    const body = Buffer.from(JSON.stringify({ evento: "mensaje" }));

    expect(() => guard.canActivate(contextoCon(body, "sha256=deadbeef"))).toThrow(UnauthorizedException);
  });

  it("rechaza con 401 si falta el header de firma", () => {
    process.env.WHATSAPP_APP_SECRET = "secreto-de-prueba";
    const body = Buffer.from("{}");

    expect(() => guard.canActivate(contextoCon(body, undefined))).toThrow(UnauthorizedException);
  });
});
