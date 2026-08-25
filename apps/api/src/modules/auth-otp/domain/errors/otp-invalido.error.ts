/**
 * Se lanza en `POST /auth/otp/verify` cuando el `otp_id` no existe, no
 * corresponde al usuario/dispositivo autenticado, ya fue consumido, expiró,
 * o el código no coincide. openapi.yaml declara 400 para todos estos casos
 * ("Código incorrecto, OTP expirado, o ya consumido") — deliberadamente no
 * se distingue el motivo exacto en la respuesta HTTP (mismo criterio que un
 * login fallido: no dar pistas de qué parte del intento era correcta).
 */
export class OtpInvalidoError extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = "OtpInvalidoError";
  }
}
