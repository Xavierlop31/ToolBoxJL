export interface OtpRegistrado {
  id: string;
  usuarioId: string;
  deviceId: string;
  /** Hash del código (nunca el código en texto plano) — ver infrastructure/hashing/otp-hasher.ts. */
  codigoHash: string;
  expiraEn: Date;
  consumidoAt: Date | null;
  createdAt: Date;
}

export interface NuevoOtpInput {
  usuarioId: string;
  deviceId: string;
  codigoHash: string;
  expiraEn: Date;
}

/**
 * Puerto de repositorio para `Otp` — mismo patrón dual (Prisma real /
 * in-memory para BDD) que `PaymentRepository`.
 */
export interface OtpRepository {
  crear(input: NuevoOtpInput): Promise<OtpRegistrado>;
  buscarPorId(id: string): Promise<OtpRegistrado | null>;
  marcarConsumido(id: string): Promise<void>;
  /**
   * Cuenta cuántos OTPs se solicitaron para este usuario/dispositivo desde
   * `desde` (inclusive) — usado por `SolicitarOtpUseCase` para aplicar el
   * rate limit del 429 declarado en openapi.yaml.
   */
  contarSolicitudesRecientes(usuarioId: string, deviceId: string, desde: Date): Promise<number>;
}
