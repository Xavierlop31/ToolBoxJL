import { Controller, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { UsuarioActual } from "../../auth/interface/decorators/usuario-actual.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import {
  EmitirTokenLivekitUseCase,
  type CredencialesSalaVoz,
} from "../application/emitir-token-livekit.use-case";

/**
 * `/voice-agent/livekit-token` (openapi.yaml, tag "Carrito y Conserje de
 * Voz") — `x-roles: [cliente]`. Ver `EmitirTokenLivekitUseCase` para la
 * decisión de arquitectura completa (Agente 3 sin cuenta de servicio
 * propia, JWT del cliente reenviado como metadata del participante
 * LiveKit).
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller()
export class VoiceAgentController {
  constructor(private readonly emitirToken: EmitirTokenLivekitUseCase) {}

  @Roles("cliente")
  @Post("voice-agent/livekit-token")
  async emitirTokenLivekit(
    @Req() request: Request,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<CredencialesSalaVoz> {
    return this.emitirToken.ejecutar(usuario, this.extraerBearer(request));
  }

  /**
   * `SupabaseAuthGuard` ya validó que este `Authorization` es un Bearer JWT
   * de Supabase válido (si no lo fuera, la request nunca hubiese llegado
   * hasta acá) — leerlo de nuevo del header, en vez de reconstruirlo a
   * partir de `request.user`, es intencional: es EL MISMO token de sesión
   * que el cliente ya tiene (con su firma original intacta), no uno nuevo
   * — el proceso del Agente 3 lo reenvía tal cual, así que tiene que ser
   * el string original, no una reserialización.
   */
  private extraerBearer(request: Request): string {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      // No debería pasar nunca (SupabaseAuthGuard ya lo exigió) — 401
      // explícito en vez de propagar un string vacío en silencio si de
      // algún modo pasara.
      throw new UnauthorizedException("Falta el header Authorization Bearer.");
    }
    return header.slice("Bearer ".length);
  }
}
