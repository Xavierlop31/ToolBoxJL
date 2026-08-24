import {
  ForbiddenException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Rol, UsuarioAutenticado } from "@toolboxjl/shared-types";
import { RolesGuard } from "./roles.guard";

function contextoConUsuario(
  usuario: UsuarioAutenticado | undefined,
): ExecutionContext {
  return {
    getHandler: () => ({}) as any,
    getClass: () => ({}) as any,
    switchToHttp: () => ({
      getRequest: () => ({ user: usuario }),
    }),
  } as unknown as ExecutionContext;
}

function reflectorConRoles(roles: Rol[] | undefined): Reflector {
  return {
    getAllAndOverride: () => roles,
  } as unknown as Reflector;
}

const USUARIO_CLIENTE: UsuarioAutenticado = {
  id: "u-1",
  email: "cliente@example.com",
  rol: "cliente",
};

const USUARIO_ADMIN: UsuarioAutenticado = {
  id: "u-2",
  email: "admin@example.com",
  rol: "admin",
};

describe("RolesGuard", () => {
  it("permite el acceso cuando el recurso no declara @Roles(...)", () => {
    const guard: CanActivate = new RolesGuard(reflectorConRoles(undefined));
    expect(
      guard.canActivate(contextoConUsuario(USUARIO_CLIENTE)),
    ).toBe(true);
  });

  it("permite el acceso cuando el rol del usuario está entre los permitidos", () => {
    const guard = new RolesGuard(reflectorConRoles(["admin", "gerente"]));
    expect(guard.canActivate(contextoConUsuario(USUARIO_ADMIN))).toBe(true);
  });

  it("lanza ForbiddenException cuando el rol del usuario no está permitido", () => {
    const guard = new RolesGuard(reflectorConRoles(["admin"]));
    expect(() =>
      guard.canActivate(contextoConUsuario(USUARIO_CLIENTE)),
    ).toThrow(ForbiddenException);
  });

  it("lanza UnauthorizedException si no hay usuario en la request (SupabaseAuthGuard no corrió antes)", () => {
    const guard = new RolesGuard(reflectorConRoles(["admin"]));
    expect(() => guard.canActivate(contextoConUsuario(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
