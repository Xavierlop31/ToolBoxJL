import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 32;

/**
 * Hashea un código OTP con scrypt (salt aleatorio por hash) — el código
 * NUNCA se persiste en texto plano, mismo criterio que se aplicaría a una
 * contraseña. Se usa `scrypt` de `node:crypto` (sin dependencia nueva,
 * disponible en el runtime de Node) en vez de bcrypt, que no es dependencia
 * de `apps/api` hoy.
 *
 * Formato de salida: `"<salt-hex>:<hash-hex>"`.
 */
export function hashCodigoOtp(codigo: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(codigo, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

/** Compara un código en texto plano contra un hash de `hashCodigoOtp`, en tiempo constante. */
export function verificarCodigoOtp(codigo: string, hashAlmacenado: string): boolean {
  const [salt, hashHex] = hashAlmacenado.split(":");
  if (!salt || !hashHex) {
    return false;
  }

  const hashIntento = scryptSync(codigo, salt, KEYLEN);
  const hashGuardado = Buffer.from(hashHex, "hex");
  if (hashIntento.length !== hashGuardado.length) {
    return false;
  }

  return timingSafeEqual(hashIntento, hashGuardado);
}
