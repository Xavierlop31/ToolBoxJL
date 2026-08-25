/**
 * Se lanza en `POST /auth/otp/request` cuando el usuario/dispositivo superó
 * el límite de solicitudes de OTP en la ventana configurada — openapi.yaml
 * declara 429 para este caso.
 */
export class LimiteOtpExcedidoError extends Error {
  constructor(deviceId: string) {
    super(
      `Se superó el límite de solicitudes de OTP para el dispositivo "${deviceId}" ` +
        `en la ventana configurada. Esperá antes de volver a solicitar un código.`,
    );
    this.name = "LimiteOtpExcedidoError";
  }
}
