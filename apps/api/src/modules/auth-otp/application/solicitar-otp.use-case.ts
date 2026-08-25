import { Inject, Injectable } from "@nestjs/common";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { generarCodigoOtp } from "../domain/otp-codigo";
import { LimiteOtpExcedidoError } from "../domain/errors/limite-otp-excedido.error";
import { TelefonoNoDisponibleError } from "../domain/errors/telefono-no-disponible.error";
import type { OtpRepository } from "../domain/otp.repository";
import type { WhatsAppOtpGateway } from "../domain/whatsapp-otp-gateway";
import {
  OTP_REPOSITORY,
  WHATSAPP_OTP_GATEWAY,
} from "../infrastructure/auth-otp.tokens";
import {
  loadOtpExpiracionMinutos,
  loadOtpRateLimitMaximo,
  loadOtpRateLimitVentanaMinutos,
} from "../infrastructure/config/whatsapp.config";
import { hashCodigoOtp } from "../infrastructure/hashing/otp-hasher";

/** Forma de respuesta 201 de `POST /auth/otp/request` (openapi.yaml). */
export interface OtpSolicitado {
  otp_id: string;
  expira_en: string;
}

/**
 * `POST /auth/otp/request` (Issue #18, HU-6.2). Genera un OTP de 6 dígitos,
 * lo persiste hasheado con expiración configurable, y lo envía por WhatsApp
 * Cloud API al teléfono del usuario autenticado. El código nunca sale de
 * este caso de uso en texto plano hacia afuera (ni se devuelve, ni se
 * loguea) — solo viaja hacia `WhatsAppOtpGateway.enviarOtp`.
 */
@Injectable()
export class SolicitarOtpUseCase {
  constructor(
    @Inject(OTP_REPOSITORY)
    private readonly otps: OtpRepository,
    @Inject(WHATSAPP_OTP_GATEWAY)
    private readonly whatsapp: WhatsAppOtpGateway,
  ) {}

  async ejecutar(usuario: UsuarioAutenticado, deviceId: string): Promise<OtpSolicitado> {
    if (!usuario.telefono) {
      throw new TelefonoNoDisponibleError(usuario.id);
    }

    const ventanaMinutos = loadOtpRateLimitVentanaMinutos();
    const maximo = loadOtpRateLimitMaximo();
    const desde = new Date(Date.now() - ventanaMinutos * 60_000);
    const solicitudesRecientes = await this.otps.contarSolicitudesRecientes(
      usuario.id,
      deviceId,
      desde,
    );
    if (solicitudesRecientes >= maximo) {
      throw new LimiteOtpExcedidoError(deviceId);
    }

    const codigo = generarCodigoOtp();
    const codigoHash = hashCodigoOtp(codigo);
    const expiraEn = new Date(Date.now() + loadOtpExpiracionMinutos() * 60_000);

    const otp = await this.otps.crear({
      usuarioId: usuario.id,
      deviceId,
      codigoHash,
      expiraEn,
    });

    // El código en texto plano solo existe en esta variable local — ya se
    // hasheó para persistencia arriba; acá se envía y se descarta.
    await this.whatsapp.enviarOtp(usuario.telefono, codigo);

    return {
      otp_id: otp.id,
      expira_en: otp.expiraEn.toISOString(),
    };
  }
}
