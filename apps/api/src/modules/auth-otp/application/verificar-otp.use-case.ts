import { Inject, Injectable } from "@nestjs/common";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { OtpInvalidoError } from "../domain/errors/otp-invalido.error";
import type { DeviceVerificationRepository } from "../domain/device-verification.repository";
import type { OtpRepository } from "../domain/otp.repository";
import {
  DEVICE_VERIFICATION_REPOSITORY,
  OTP_REPOSITORY,
} from "../infrastructure/auth-otp.tokens";
import { verificarCodigoOtp } from "../infrastructure/hashing/otp-hasher";

/** Forma de respuesta 200 de `POST /auth/otp/verify` (openapi.yaml). */
export interface OtpVerificado {
  verificado: true;
  device_id: string;
}

/**
 * `POST /auth/otp/verify` (Issue #18, HU-6.2). Valida el código contra el
 * OTP vigente; si es correcto y no expiró, marca el `device_id` como
 * verificado para el usuario autenticado.
 */
@Injectable()
export class VerificarOtpUseCase {
  constructor(
    @Inject(OTP_REPOSITORY)
    private readonly otps: OtpRepository,
    @Inject(DEVICE_VERIFICATION_REPOSITORY)
    private readonly verificaciones: DeviceVerificationRepository,
  ) {}

  async ejecutar(
    usuario: UsuarioAutenticado,
    otpId: string,
    codigo: string,
    deviceId: string,
  ): Promise<OtpVerificado> {
    const otp = await this.otps.buscarPorId(otpId);
    if (otp?.usuarioId !== usuario.id || otp?.deviceId !== deviceId) {
      // Mismo mensaje genérico para "no existe" y "no corresponde a este
      // usuario/dispositivo" — no dar pistas de cuál de los dos pasó.
      throw new OtpInvalidoError("El OTP no existe, expiró, o ya fue utilizado.");
    }
    if (otp.consumidoAt) {
      throw new OtpInvalidoError("El OTP no existe, expiró, o ya fue utilizado.");
    }
    if (otp.expiraEn.getTime() < Date.now()) {
      throw new OtpInvalidoError("El OTP no existe, expiró, o ya fue utilizado.");
    }
    if (!verificarCodigoOtp(codigo, otp.codigoHash)) {
      throw new OtpInvalidoError("El código ingresado es incorrecto.");
    }

    await this.otps.marcarConsumido(otp.id);
    await this.verificaciones.marcarVerificado(usuario.id, deviceId);

    return { verificado: true, device_id: deviceId };
  }
}
