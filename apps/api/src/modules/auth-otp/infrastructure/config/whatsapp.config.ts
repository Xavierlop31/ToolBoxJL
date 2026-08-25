export interface WhatsAppCredentials {
  readonly token: string;
  readonly phoneNumberId: string;
  readonly businessAccountId: string;
}

/**
 * Credenciales de WhatsApp Cloud API. Mismo criterio que `loadWompiCredentials`
 * (PaymentsModule): fallan explícito en runtime si no están, sin fallback
 * silencioso — son credenciales, no una regla de negocio.
 *
 * A diferencia de Wompi (Sprint 3, nunca tuvo credenciales de sandbox
 * reales disponibles), acá SÍ hay credenciales reales cargadas como
 * secrets de GitHub Actions (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
 * `WHATSAPP_BUSINESS_ACCOUNT_ID`) — ver
 * `.github/workflows/whatsapp-otp-integration.yml` para la validación real
 * en CI.
 */
export function loadWhatsAppCredentials(
  env: NodeJS.ProcessEnv = process.env,
): WhatsAppCredentials {
  const token = env.WHATSAPP_TOKEN?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const businessAccountId = env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
  if (!token || !phoneNumberId || !businessAccountId) {
    throw new Error(
      "WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID y/o WHATSAPP_BUSINESS_ACCOUNT_ID no están " +
        "definidas. WhatsAppOtpGatewayService (implementación real contra WhatsApp Cloud API) " +
        "no puede autenticar ni enviar mensajes sin ellas. Definilas en el entorno — ver " +
        "apps/api/.env.example. (Para tests/BDD, usá InMemoryWhatsAppOtpGateway en vez de la " +
        "implementación real — no requiere estas variables.)",
    );
  }
  return { token, phoneNumberId, businessAccountId };
}

/**
 * Minutos de validez de un OTP antes de expirar (RF-6.2/HU-6.2). Regla de
 * negocio configurable, no un secreto — mismo criterio que
 * `WOMPI_SPLIT_LOGISTICA_PCT`/`RECARGO_LOGISTICO_POR_KG_COP`: tiene un
 * default razonable (10 minutos, tal como pide el brief del Tech Lead) si
 * la env var no está definida.
 */
export function loadOtpExpiracionMinutos(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.OTP_EXPIRACION_MINUTOS?.trim();
  if (!raw) {
    return 10;
  }
  const valor = Number(raw);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`OTP_EXPIRACION_MINUTOS debe ser un entero > 0 (recibido: "${raw}").`);
  }
  return valor;
}

/**
 * Máximo de solicitudes de OTP permitidas por usuario/dispositivo dentro de
 * `loadOtpRateLimitVentanaMinutos()` — respalda el 429 declarado en
 * openapi.yaml para `POST /auth/otp/request`. Regla de negocio configurable,
 * mismo criterio que el resto de esta config.
 */
export function loadOtpRateLimitMaximo(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.OTP_RATE_LIMIT_MAXIMO?.trim();
  if (!raw) {
    return 3;
  }
  const valor = Number(raw);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`OTP_RATE_LIMIT_MAXIMO debe ser un entero > 0 (recibido: "${raw}").`);
  }
  return valor;
}

/** Ventana (en minutos) sobre la que se cuenta el rate limit de arriba. Default: 15 minutos. */
export function loadOtpRateLimitVentanaMinutos(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.OTP_RATE_LIMIT_VENTANA_MINUTOS?.trim();
  if (!raw) {
    return 15;
  }
  const valor = Number(raw);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(`OTP_RATE_LIMIT_VENTANA_MINUTOS debe ser un entero > 0 (recibido: "${raw}").`);
  }
  return valor;
}
