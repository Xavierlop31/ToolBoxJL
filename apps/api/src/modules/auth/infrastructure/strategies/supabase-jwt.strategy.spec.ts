import { TokenInvalidoError } from "../../domain/errors/token-invalido.error";
import { VerificarAccesoUseCase } from "../../application/verificar-acceso.use-case";
import { SupabaseJwtStrategy } from "./supabase-jwt.strategy";

const CONFIG_DE_PRUEBA = {
  jwksUri: "https://proyecto.supabase.co/auth/v1/.well-known/jwks.json",
  issuer: "https://proyecto.supabase.co/auth/v1",
  audience: "authenticated",
};

describe("SupabaseJwtStrategy", () => {
  it("se construye sin tocar la red (jwks-rsa resuelve la clave de forma diferida, recién al validar un token)", () => {
    expect(
      () => new SupabaseJwtStrategy(CONFIG_DE_PRUEBA, new VerificarAccesoUseCase()),
    ).not.toThrow();
  });

  describe("validate", () => {
    it("delega en VerificarAccesoUseCase y devuelve el UsuarioAutenticado", () => {
      const strategy = new SupabaseJwtStrategy(
        CONFIG_DE_PRUEBA,
        new VerificarAccesoUseCase(),
      );

      const usuario = strategy.validate({
        sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        email: "admin@example.com",
        exp: 0,
        iat: 0,
        app_metadata: { rol: "admin" },
      });

      expect(usuario).toEqual({
        id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        email: "admin@example.com",
        rol: "admin",
      });
    });

    it("propaga TokenInvalidoError cuando el payload no trae un rol reconocido", () => {
      const strategy = new SupabaseJwtStrategy(
        CONFIG_DE_PRUEBA,
        new VerificarAccesoUseCase(),
      );

      expect(() =>
        strategy.validate({
          sub: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          exp: 0,
          iat: 0,
        }),
      ).toThrow(TokenInvalidoError);
    });
  });
});
