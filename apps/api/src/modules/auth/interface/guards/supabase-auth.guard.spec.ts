import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SupabaseAuthGuard } from "./supabase-auth.guard";
import { TokenInvalidoError } from "../../domain/errors/token-invalido.error";

function contexto(): ExecutionContext {
  return {
    getHandler: () => ({}) as any,
    getClass: () => ({}) as any,
    switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe("SupabaseAuthGuard", () => {
  it("permite el acceso sin exigir un token cuando el recurso está marcado @Public()", () => {
    const reflector = {
      getAllAndOverride: () => true,
    } as unknown as Reflector;
    const guard = new SupabaseAuthGuard(reflector);

    expect(guard.canActivate(contexto())).toBe(true);
  });

  it("delega en la estrategia de Passport (AuthGuard base) cuando el recurso no es público", () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const guard = new SupabaseAuthGuard(reflector);
    const superCanActivateSpy = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), "canActivate")
      .mockReturnValue(true);

    expect(guard.canActivate(contexto())).toBe(true);
    expect(superCanActivateSpy).toHaveBeenCalled();

    superCanActivateSpy.mockRestore();
  });
});

describe("SupabaseAuthGuard.handleRequest", () => {
  it("traduce un TokenInvalidoError de la estrategia en UnauthorizedException con el mismo mensaje", () => {
    const reflector = {} as unknown as Reflector;
    const guard = new SupabaseAuthGuard(reflector);
    const error = new TokenInvalidoError("el token no incluye un rol reconocido");

    expect(() =>
      guard.handleRequest(error, undefined, undefined, contexto()),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.handleRequest(error, undefined, undefined, contexto()),
    ).toThrow(error.message);
  });

  it("delega en el comportamiento default (super.handleRequest) para cualquier otro caso", () => {
    const reflector = {} as unknown as Reflector;
    const guard = new SupabaseAuthGuard(reflector);
    const superHandleRequestSpy = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), "handleRequest")
      .mockReturnValue({ id: "usuario-1" });

    const resultado = guard.handleRequest(
      new Error("fallo inesperado"),
      undefined,
      undefined,
      contexto(),
    );

    expect(resultado).toEqual({ id: "usuario-1" });
    expect(superHandleRequestSpy).toHaveBeenCalled();

    superHandleRequestSpy.mockRestore();
  });
});
