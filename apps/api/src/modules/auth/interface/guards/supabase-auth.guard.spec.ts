import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

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
