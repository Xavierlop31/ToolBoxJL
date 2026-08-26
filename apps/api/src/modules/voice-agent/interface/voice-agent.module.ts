import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { EmitirTokenLivekitUseCase } from "../application/emitir-token-livekit.use-case";
import { LIVEKIT_TOKEN_ISSUER } from "../infrastructure/voice-agent.tokens";
import { LivekitAccessTokenIssuerService } from "../infrastructure/livekit/livekit-access-token-issuer.service";
import { VoiceAgentController } from "./voice-agent.controller";

/**
 * VoiceAgentModule (Sprint 9, Issues #26/#27 — HU-10.1/10.2). Wiring de
 * producción por defecto: `LivekitAccessTokenIssuerService` (implementación
 * real, requiere `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`/`LIVEKIT_URL`, ver
 * infrastructure/config/livekit.config.ts — nunca probada contra un
 * servidor LiveKit real en este entorno). Los tests/BDD arman su propio
 * `TestingModule` con `FakeLivekitTokenIssuer`, mismo criterio que el resto
 * de los módulos.
 */
@Module({
  imports: [AuthModule],
  controllers: [VoiceAgentController],
  providers: [
    { provide: LIVEKIT_TOKEN_ISSUER, useClass: LivekitAccessTokenIssuerService },
    EmitirTokenLivekitUseCase,
  ],
  exports: [LIVEKIT_TOKEN_ISSUER, EmitirTokenLivekitUseCase],
})
export class VoiceAgentModule {}
