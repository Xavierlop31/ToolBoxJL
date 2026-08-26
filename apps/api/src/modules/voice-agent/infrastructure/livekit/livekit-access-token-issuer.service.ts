import { Injectable } from "@nestjs/common";
import { AccessToken } from "livekit-server-sdk";
import type { LivekitTokenIssuer, LivekitTokenParams } from "../../domain/livekit-token-issuer";
import { loadLivekitCredentials } from "../config/livekit.config";

/**
 * Implementación real (`livekit-server-sdk`) de `LivekitTokenIssuer`.
 * Requiere `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`/`LIVEKIT_URL` (ver
 * `loadLivekitCredentials`) — falla al construirse si faltan, mismo
 * criterio que `WompiGatewayService`/`PrismaService`.
 *
 * *** NUNCA FUE PROBADA CONTRA UN SERVIDOR LIVEKIT REAL *** — este entorno
 * de desarrollo no tiene una instancia LiveKit accesible. El uso del SDK
 * (`AccessToken`, `addGrant({ roomJoin, room })`, `metadata`, `toJwt()`)
 * sigue la documentación pública de `livekit-server-sdk@2.18` pero no fue
 * validado end-to-end contra un servidor real — mismo criterio que
 * `WompiGatewayService` respecto a Wompi sandbox. Es responsabilidad de
 * quien tenga acceso al proyecto LiveKit (Tech Lead/Arquitecto) validar esto
 * antes de un despliegue real. Para tests/BDD, usá `FakeLivekitTokenIssuer`.
 */
@Injectable()
export class LivekitAccessTokenIssuerService implements LivekitTokenIssuer {
  readonly url: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor() {
    const credenciales = loadLivekitCredentials();
    this.apiKey = credenciales.apiKey;
    this.apiSecret = credenciales.apiSecret;
    this.url = credenciales.url;
  }

  async emitir(params: LivekitTokenParams): Promise<string> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: params.identity,
      ttl: params.ttlSegundos,
      // `metadata` del participante — el proceso del Agente 3
      // (apps/voice-agent) lo lee al unirse a la sala y reenvía este mismo
      // JWT tal cual como Bearer contra /cart/*, /catalog/search (ver
      // EmitirTokenLivekitUseCase para el detalle completo).
      metadata: params.metadataJwt,
    });
    token.addGrant({ roomJoin: true, room: params.room });
    return token.toJwt();
  }
}
