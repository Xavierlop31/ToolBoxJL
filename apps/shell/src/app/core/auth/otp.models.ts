/**
 * Tipos locales que reflejan los schemas de `POST /auth/otp/request` y
 * `POST /auth/otp/verify` (HU-6.2, Issue #18), openapi.yaml líneas 66-145.
 */
export interface OtpRequestInput {
  device_id: string;
}

export interface OtpRequestResponse {
  otp_id: string;
  /** ISO 8601 (date-time) — momento en que el OTP deja de ser válido. */
  expira_en: string;
}

export interface OtpVerifyInput {
  otp_id: string;
  /** 6 dígitos. */
  codigo: string;
  device_id: string;
}

export interface OtpVerifyResponse {
  verificado: boolean;
  device_id: string;
}
