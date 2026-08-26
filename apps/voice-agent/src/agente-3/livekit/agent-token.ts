import { AccessToken } from "livekit-server-sdk";
import type { LiveKitConfig } from "../config";

/**
 * Prefijo de `identity` que usa el PROPIO Agente 3 al unirse a una sala como
 * participante "bot" — se usa acá (para mintar el token) y en
 * `webhook-event-router.ts` (para IGNORAR el evento `participant_joined` que
 * el propio bot dispara al unirse, y no intentar unirse a su propia sala de
 * nuevo en loop).
 */
export const AGENTE_3_BOT_IDENTITY_PREFIX = "agente-3-bot";

export interface TokenDeAgente {
  identity: string;
  token: string;
}

/**
 * Mintra el token de sala que el PROCESO del Agente 3 usa para unirse como
 * participante — distinto del token que `apps/api` emite para el cliente
 * (`POST /voice-agent/livekit-token`, con el JWT de Supabase embebido en sus
 * metadata, ver `../metadata.ts`). Este token del bot NO lleva JWT de
 * Supabase en sus metadata — el bot no llama a `apps/api` autenticado como sí
 * mismo, siempre reenvía el JWT que lee del participante cliente.
 *
 * TTL corto (10 minutos) — mismo criterio de "tokens de sala de corta
 * duración" del TRD §4.3; si una sesión de voz dura más que eso, LiveKit
 * mantiene la conexión ya establecida (el TTL del JWT solo afecta el
 * `connect()` inicial, no la sesión WebRTC ya activa).
 */
export async function mintarTokenDeAgente(config: LiveKitConfig, roomName: string): Promise<TokenDeAgente> {
  const identity = `${AGENTE_3_BOT_IDENTITY_PREFIX}-${roomName}`;
  const accessToken = new AccessToken(config.apiKey, config.apiSecret, { identity, ttl: "10m" });
  accessToken.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  const token = await accessToken.toJwt();
  return { identity, token };
}
