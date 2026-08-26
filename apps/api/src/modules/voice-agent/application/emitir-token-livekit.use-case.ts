import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import type { LivekitTokenIssuer } from "../domain/livekit-token-issuer";
import { LIVEKIT_TOKEN_ISSUER } from "../infrastructure/voice-agent.tokens";

/**
 * TTL corto del `AccessToken` de LiveKit (TRD §4.3: "tokens de sala de corta
 * duración emitidos por el backend") — 10 minutos, acotado a una sola
 * sesión de voz. No confundir con el TTL del JWT de Supabase embebido como
 * metadata (ese lo controla Supabase Auth, no este caso de uso).
 */
const TTL_SEGUNDOS = 10 * 60;

export interface CredencialesSalaVoz {
  url: string;
  token: string;
  room: string;
}

/**
 * `POST /voice-agent/livekit-token` (HU-10.1/10.2, Issues #26/#27).
 *
 * Decisión de arquitectura clave (ya confirmada con el Arquitecto — ver
 * openapi.yaml, comentario del path, y el prompt del Tech Lead de este
 * sprint, no se cuestiona acá): el Agente 3 NO tiene una cuenta de servicio
 * Supabase propia, a diferencia de agente-1 (Sprint 7) y agente-2
 * (Sprint 8). En su lugar, este caso de uso arma una sala LiveKit nueva y
 * embebe el JWT de Supabase DEL PROPIO CLIENTE (el mismo Bearer que
 * autenticó esta llamada, extraído del header `Authorization` por
 * `VoiceAgentController` y pasado acá como `jwtDelCliente`) en el
 * `metadata` del participante. El proceso del Agente 3
 * (`apps/voice-agent`, otro subagente/worktree, TRD §4.3) lee ese metadata
 * al unirse a la sala y lo reenvía TAL CUAL como Bearer al invocar
 * `GET /cart`, `POST /cart/add-item` y `GET /catalog/search` en nombre de
 * este cliente — por eso esos endpoints de carrito solo aceptan
 * `x-roles: [cliente]`, nunca un rol de servicio "agente-3": no existe tal
 * rol (ver `Rol`/`ROLES`, `@toolboxjl/shared-types` — el comentario de esa
 * lista dice explícitamente que "agente-3" se agrega recién en su propio
 * sprint, "no antes"; este sprint ES ese momento, y la decisión fue
 * justamente NO agregarlo).
 *
 * Riesgo de seguridad documentado, NO resuelto acá a propósito (fuera de
 * alcance de un proyecto académico sin despliegue productivo real — ver
 * CLAUDE.md, "Naturaleza académica del proyecto"): el JWT de sesión del
 * cliente queda embebido en el metadata de la sala LiveKit, visible para
 * cualquier participante/proceso con acceso server-side a esa sala (ej. vía
 * `RoomServiceClient`), no solo para el Agente 3. Mitigantes parciales: (1)
 * es el MISMO access token de sesión que el cliente ya tenía (no se genera
 * un token nuevo de mayor alcance), y (2) el `AccessToken` de LiveKit en sí
 * expira en 10 minutos. Si esto se lleva a producción real, el Tech
 * Lead/Arquitecto debería evaluar un token de alcance más acotado en vez de
 * reenviar el JWT de sesión completo.
 */
@Injectable()
export class EmitirTokenLivekitUseCase {
  constructor(
    @Inject(LIVEKIT_TOKEN_ISSUER) private readonly issuer: LivekitTokenIssuer,
  ) {}

  async ejecutar(
    usuario: UsuarioAutenticado,
    jwtDelCliente: string,
  ): Promise<CredencialesSalaVoz> {
    // Nombre único por sesión — no hace falta que sea reutilizable entre
    // sesiones del mismo cliente (instrucción explícita del Tech Lead):
    // timestamp + sufijo random evita colisiones si el mismo cliente abre
    // dos pestañas en el mismo milisegundo.
    const room = `voice-${usuario.id}-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const token = await this.issuer.emitir({
      identity: usuario.id,
      room,
      metadataJwt: jwtDelCliente,
      ttlSegundos: TTL_SEGUNDOS,
    });

    return {
      url: this.issuer.url,
      token,
      room,
    };
  }
}
