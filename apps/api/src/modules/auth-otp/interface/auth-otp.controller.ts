import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ROLES_HUMANOS, type UsuarioAutenticado } from "@toolboxjl/shared-types";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { UsuarioActual } from "../../auth/interface/decorators/usuario-actual.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { SolicitarOtpUseCase, type OtpSolicitado } from "../application/solicitar-otp.use-case";
import { VerificarOtpUseCase, type OtpVerificado } from "../application/verificar-otp.use-case";
import { LimiteOtpExcedidoError } from "../domain/errors/limite-otp-excedido.error";
import { OtpInvalidoError } from "../domain/errors/otp-invalido.error";
import { TelefonoNoDisponibleError } from "../domain/errors/telefono-no-disponible.error";
import { SolicitarOtpDto } from "./dto/solicitar-otp.dto";
import { VerificarOtpDto } from "./dto/verificar-otp.dto";

/**
 * `/auth/otp/{request,verify}` — Issue #18 (HU-6.2). `x-roles` en
 * openapi.yaml lista los 5 roles humanos de negocio (cualquier usuario
 * autenticado puede pasar por esta verificación) — se declara explícito con
 * `@Roles(...ROLES_HUMANOS)` en vez de omitir el decorador, para que quede
 * trazable 1:1 con el contrato aunque el efecto sea el mismo que no
 * anotarlo. Deliberadamente `ROLES_HUMANOS`, no `ROLES` (Sprint 7 —
 * `ROLES` ya incluye `"agente-1"`, un rol de servicio que openapi.yaml NO
 * declara para este recurso; ver `packages/shared-types/src/rol.ts`).
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class AuthOtpController {
  constructor(
    private readonly solicitarOtp: SolicitarOtpUseCase,
    private readonly verificarOtp: VerificarOtpUseCase,
  ) {}

  @Roles(...ROLES_HUMANOS)
  @Post("auth/otp/request")
  @HttpCode(201)
  async request(
    @Body() dto: SolicitarOtpDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<OtpSolicitado> {
    try {
      return await this.solicitarOtp.ejecutar(usuario, dto.device_id);
    } catch (error) {
      if (error instanceof TelefonoNoDisponibleError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof LimiteOtpExcedidoError) {
        throw new HttpException(error.message, HttpStatus.TOO_MANY_REQUESTS);
      }
      throw error;
    }
  }

  @Roles(...ROLES_HUMANOS)
  @Post("auth/otp/verify")
  @HttpCode(200)
  async verify(
    @Body() dto: VerificarOtpDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<OtpVerificado> {
    try {
      return await this.verificarOtp.ejecutar(usuario, dto.otp_id, dto.codigo, dto.device_id);
    } catch (error) {
      if (error instanceof OtpInvalidoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
