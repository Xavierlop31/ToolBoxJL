import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { SolicitarOtpUseCase } from "../application/solicitar-otp.use-case";
import { VerificarOtpUseCase } from "../application/verificar-otp.use-case";
import {
  DEVICE_VERIFICATION_REPOSITORY,
  OTP_REPOSITORY,
  WHATSAPP_OTP_GATEWAY,
} from "../infrastructure/auth-otp.tokens";
import { PrismaDeviceVerificationRepository } from "../infrastructure/prisma/prisma-device-verification.repository";
import { PrismaOtpRepository } from "../infrastructure/prisma/prisma-otp.repository";
import { WhatsAppOtpGatewayService } from "../infrastructure/whatsapp/whatsapp-otp-gateway.service";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { AuthOtpController } from "./auth-otp.controller";

/**
 * AuthOtpModule (Sprint 6, Issue #18 / HU-6.2). Módulo nuevo y separado de
 * `AuthModule` (que solo verifica JWT de Supabase + RBAC, sin controllers
 * propios) — mismo criterio que el resto de los módulos de dominio, que
 * importan `AuthModule` para reutilizar sus guards en vez de duplicarlos.
 *
 * Alcance deliberadamente acotado (decisión del Tech Lead, ver brief del
 * Issue #18): este módulo genera/envía/verifica el OTP y persiste qué
 * `device_id` quedó verificado para qué usuario — NO agrega ningún guard
 * global que bloquee el resto de los endpoints del API hasta verificar. El
 * "acceso bloqueado hasta verificar" de la HU se resuelve del lado del
 * Frontend, consultando el estado de verificación.
 *
 * Wiring de producción por defecto: `PrismaOtpRepository`/
 * `PrismaDeviceVerificationRepository` (requieren `DATABASE_URL`) y
 * `WhatsAppOtpGatewayService` (implementación real contra WhatsApp Cloud
 * API, requiere `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`/
 * `WHATSAPP_BUSINESS_ACCOUNT_ID` — a diferencia de Wompi, SÍ hay
 * credenciales reales disponibles, ver
 * infrastructure/whatsapp/whatsapp-otp-gateway.service.ts). Los tests/BDD
 * arman su propio `TestingModule` con las implementaciones in-memory,
 * mismo criterio que el resto de los módulos.
 */
@Module({
  imports: [AuthModule],
  controllers: [AuthOtpController],
  providers: [
    PrismaService,
    { provide: OTP_REPOSITORY, useClass: PrismaOtpRepository },
    { provide: DEVICE_VERIFICATION_REPOSITORY, useClass: PrismaDeviceVerificationRepository },
    { provide: WHATSAPP_OTP_GATEWAY, useClass: WhatsAppOtpGatewayService },
    SolicitarOtpUseCase,
    VerificarOtpUseCase,
  ],
  exports: [
    OTP_REPOSITORY,
    DEVICE_VERIFICATION_REPOSITORY,
    WHATSAPP_OTP_GATEWAY,
    SolicitarOtpUseCase,
    VerificarOtpUseCase,
  ],
})
export class AuthOtpModule {}
