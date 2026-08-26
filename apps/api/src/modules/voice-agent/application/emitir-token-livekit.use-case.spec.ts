import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { FakeLivekitTokenIssuer } from "../infrastructure/in-memory/fake-livekit-token-issuer";
import { EmitirTokenLivekitUseCase } from "./emitir-token-livekit.use-case";

function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return { id: "cliente-1", email: "cliente@example.com", rol: "cliente", ...overrides };
}

const JWT_DEL_CLIENTE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.jwt";

describe("EmitirTokenLivekitUseCase", () => {
  let issuer: FakeLivekitTokenIssuer;
  let useCase: EmitirTokenLivekitUseCase;

  beforeEach(() => {
    issuer = new FakeLivekitTokenIssuer();
    useCase = new EmitirTokenLivekitUseCase(issuer);
  });

  it("devuelve url/token/room y usa la url del issuer tal cual", async () => {
    const credenciales = await useCase.ejecutar(usuario(), JWT_DEL_CLIENTE);

    expect(credenciales.url).toBe(issuer.url);
    expect(credenciales.token).toMatch(/^fake-jwt-for-cliente-1-/);
    expect(credenciales.room).toMatch(/^voice-cliente-1-/);
  });

  it("embebe el JWT del propio cliente como metadata del participante (Agente 3 sin cuenta de servicio)", async () => {
    await useCase.ejecutar(usuario({ id: "cliente-77" }), JWT_DEL_CLIENTE);

    expect(issuer.llamadas).toHaveLength(1);
    expect(issuer.llamadas[0]).toMatchObject({
      identity: "cliente-77",
      metadataJwt: JWT_DEL_CLIENTE,
      ttlSegundos: 10 * 60,
    });
  });

  it("genera un nombre de sala único por invocación (no reutilizable entre sesiones del mismo cliente)", async () => {
    const primera = await useCase.ejecutar(usuario(), JWT_DEL_CLIENTE);
    const segunda = await useCase.ejecutar(usuario(), JWT_DEL_CLIENTE);

    expect(primera.room).not.toBe(segunda.room);
  });
});
