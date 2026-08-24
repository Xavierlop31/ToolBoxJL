import { TokenInvalidoError } from "../domain/errors/token-invalido.error";
import type { SupabaseJwtPayload } from "./supabase-jwt-payload";
import { VerificarAccesoUseCase } from "./verificar-acceso.use-case";

function payloadBase(overrides: Partial<SupabaseJwtPayload> = {}): SupabaseJwtPayload {
  return {
    sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    email: "cliente@example.com",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    app_metadata: { rol: "cliente" },
    ...overrides,
  };
}

describe("VerificarAccesoUseCase", () => {
  const useCase = new VerificarAccesoUseCase();

  it("extrae id/email/rol de un payload válido con rol en app_metadata", () => {
    const usuario = useCase.ejecutar(payloadBase());

    expect(usuario).toEqual({
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "cliente@example.com",
      rol: "cliente",
    });
  });

  it("acepta el rol como fallback en user_metadata.rol si app_metadata no lo trae", () => {
    const usuario = useCase.ejecutar(
      payloadBase({ app_metadata: {}, user_metadata: { rol: "gerente" } }),
    );

    expect(usuario.rol).toBe("gerente");
  });

  it("prioriza app_metadata.rol por sobre user_metadata.rol si ambos están presentes", () => {
    const usuario = useCase.ejecutar(
      payloadBase({
        app_metadata: { rol: "admin" },
        user_metadata: { rol: "cliente" },
      }),
    );

    expect(usuario.rol).toBe("admin");
  });

  it("normaliza un email ausente a null en vez de undefined", () => {
    const usuario = useCase.ejecutar(payloadBase({ email: undefined }));
    expect(usuario.email).toBeNull();
  });

  it("lanza TokenInvalidoError si falta el sub", () => {
    expect(() =>
      useCase.ejecutar(payloadBase({ sub: undefined as unknown as string })),
    ).toThrow(TokenInvalidoError);
  });

  it("lanza TokenInvalidoError si no hay rol reconocido en ningún claim", () => {
    expect(() =>
      useCase.ejecutar(payloadBase({ app_metadata: {}, user_metadata: {} })),
    ).toThrow(TokenInvalidoError);
  });

  it("lanza TokenInvalidoError si el rol presente no es uno de los 5 roles válidos", () => {
    expect(() =>
      useCase.ejecutar(payloadBase({ app_metadata: { rol: "superadmin" } })),
    ).toThrow(/rol de negocio reconocido/);
  });
});
