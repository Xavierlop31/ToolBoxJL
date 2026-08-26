import { Injectable } from "@nestjs/common";
import type { LivekitTokenIssuer, LivekitTokenParams } from "../../domain/livekit-token-issuer";

/**
 * Implementación en memoria de `LivekitTokenIssuer` — usada SOLO por los
 * tests unitarios y los steps de Cucumber (mismo criterio que
 * `InMemoryWompiGateway`): no requiere credenciales de LiveKit ni firma un
 * JWT real, no llama a la red. `llamadas` queda expuesto para que los tests
 * verifiquen QUÉ se le pidió emitir (identity/room/metadata/ttl), no solo
 * que devolvió un string.
 */
@Injectable()
export class FakeLivekitTokenIssuer implements LivekitTokenIssuer {
  url = "wss://fake.livekit.test";
  llamadas: LivekitTokenParams[] = [];

  async emitir(params: LivekitTokenParams): Promise<string> {
    this.llamadas.push(params);
    return `fake-jwt-for-${params.identity}-${params.room}`;
  }
}
