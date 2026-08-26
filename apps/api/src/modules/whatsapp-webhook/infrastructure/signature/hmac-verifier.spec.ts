import { createHmac } from "node:crypto";
import { verificarFirmaWhatsApp } from "./hmac-verifier";

const APP_SECRET = "shh-its-a-secret";

function firmarComoMeta(body: Buffer, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("verificarFirmaWhatsApp", () => {
  it("acepta una firma válida calculada con el mismo app secret", () => {
    const body = Buffer.from(JSON.stringify({ hola: "mundo" }));
    const firma = firmarComoMeta(body, APP_SECRET);

    expect(verificarFirmaWhatsApp(body, firma, APP_SECRET)).toBe(true);
  });

  it("rechaza una firma calculada con otro app secret", () => {
    const body = Buffer.from(JSON.stringify({ hola: "mundo" }));
    const firma = firmarComoMeta(body, "otro-secret");

    expect(verificarFirmaWhatsApp(body, firma, APP_SECRET)).toBe(false);
  });

  it("rechaza si el body fue modificado después de firmarlo", () => {
    const bodyOriginal = Buffer.from(JSON.stringify({ hola: "mundo" }));
    const firma = firmarComoMeta(bodyOriginal, APP_SECRET);
    const bodyAlterado = Buffer.from(JSON.stringify({ hola: "mundo!" }));

    expect(verificarFirmaWhatsApp(bodyAlterado, firma, APP_SECRET)).toBe(false);
  });

  it("rechaza si falta el header de firma", () => {
    const body = Buffer.from("{}");
    expect(verificarFirmaWhatsApp(body, undefined, APP_SECRET)).toBe(false);
  });

  it("rechaza un header sin el prefijo sha256=", () => {
    const body = Buffer.from("{}");
    expect(verificarFirmaWhatsApp(body, "deadbeef", APP_SECRET)).toBe(false);
  });

  it("rechaza un hex de largo distinto sin lanzar (timingSafeEqual exige mismo largo)", () => {
    const body = Buffer.from("{}");
    expect(verificarFirmaWhatsApp(body, "sha256=abcd", APP_SECRET)).toBe(false);
  });
});
