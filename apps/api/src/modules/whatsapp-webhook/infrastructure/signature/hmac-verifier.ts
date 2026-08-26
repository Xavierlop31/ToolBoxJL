import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica la firma `X-Hub-Signature-256` que WhatsApp Cloud API manda en
 * cada POST del webhook: `sha256=<hex de HMAC-SHA256(rawBody, appSecret)>`.
 * Comparación en tiempo constante (`timingSafeEqual`) para no filtrar el
 * secreto por timing — mismo criterio de hardening que cualquier
 * verificación de firma de webhook.
 *
 * `rawBody` DEBE ser los bytes EXACTOS recibidos (antes de que Express los
 * parsee a JSON) — la firma se calcula sobre el body crudo, no sobre un
 * `JSON.stringify` re-serializado (que puede no ser byte-a-byte idéntico:
 * orden de claves, espacios). Ver `main.ts` (`rawBody: true`) y
 * `whatsapp-signature.guard.ts`.
 */
export function verificarFirmaWhatsApp(
  rawBody: Buffer,
  headerSignature: string | undefined,
  appSecret: string,
): boolean {
  if (!headerSignature || !headerSignature.startsWith("sha256=")) {
    return false;
  }
  const firmaRecibidaHex = headerSignature.slice("sha256=".length);
  const firmaEsperadaHex = createHmac("sha256", appSecret).update(rawBody).digest("hex");

  const bufferRecibido = Buffer.from(firmaRecibidaHex, "hex");
  const bufferEsperado = Buffer.from(firmaEsperadaHex, "hex");
  if (bufferRecibido.length !== bufferEsperado.length) {
    return false;
  }
  return timingSafeEqual(bufferRecibido, bufferEsperado);
}
