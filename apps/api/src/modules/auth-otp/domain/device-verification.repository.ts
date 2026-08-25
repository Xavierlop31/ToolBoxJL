/**
 * Puerto de repositorio para `DeviceVerification` — registra qué
 * `device_id` ya verificó OTP para qué usuario. Mismo patrón dual (Prisma
 * real / in-memory para BDD) que el resto de los módulos.
 */
export interface DeviceVerificationRepository {
  estaVerificado(usuarioId: string, deviceId: string): Promise<boolean>;
  marcarVerificado(usuarioId: string, deviceId: string): Promise<void>;
}
