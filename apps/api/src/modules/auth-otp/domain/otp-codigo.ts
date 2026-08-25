import { randomInt } from "node:crypto";

/** Genera un código OTP de 6 dígitos (con ceros a la izquierda), criptográficamente aleatorio. */
export function generarCodigoOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
