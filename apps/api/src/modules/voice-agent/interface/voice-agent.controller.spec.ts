import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { FakeLivekitTokenIssuer } from "../infrastructure/in-memory/fake-livekit-token-issuer";
import { EmitirTokenLivekitUseCase } from "../application/emitir-token-livekit.use-case";
import { VoiceAgentController } from "./voice-agent.controller";

function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return { id: "cliente-1", email: "cliente@example.com", rol: "cliente", ...overrides };
}

function requestConAuth(authorization?: string): Request {
  return { headers: { authorization } } as unknown as Request;
}

const JWT_DEL_CLIENTE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.jwt";

describe("VoiceAgentController", () => {
  let issuer: FakeLivekitTokenIssuer;
  let controller: VoiceAgentController;

  beforeEach(() => {
    issuer = new FakeLivekitTokenIssuer();
    controller = new VoiceAgentController(new EmitirTokenLivekitUseCase(issuer));
  });

  it("extrae el Bearer del header Authorization y lo reenvía como metadata del participante", async () => {
    const request = requestConAuth(`Bearer ${JWT_DEL_CLIENTE}`);

    const credenciales = await controller.emitirTokenLivekit(request, usuario());

    expect(credenciales.token).toMatch(/^fake-jwt-for-cliente-1-/);
    expect(issuer.llamadas[0]?.metadataJwt).toBe(JWT_DEL_CLIENTE);
  });

  it("lanza 401 si por algún motivo no hay header Authorization Bearer (no debería pasar: SupabaseAuthGuard ya lo exige)", async () => {
    const request = requestConAuth(undefined);

    await expect(controller.emitirTokenLivekit(request, usuario())).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
