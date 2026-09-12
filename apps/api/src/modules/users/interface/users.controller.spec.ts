import { BadRequestException, ForbiddenException, NotFoundException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Rol, UsuarioAutenticado } from "@toolboxjl/shared-types";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { InMemoryUserRepository } from "../infrastructure/in-memory/in-memory-user.repository";
import { ListarUsuariosUseCase } from "../application/listar-usuarios.use-case";
import { ActualizarUsuarioUseCase } from "../application/actualizar-usuario.use-case";
import type { UsuarioBasico } from "../domain/user.repository";
import { AdminUsersController } from "./users.controller";

function usuarioAutenticado(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return { id: "admin-1", email: "admin@example.com", rol: "admin", ...overrides };
}

function usuarioBasico(overrides: Partial<UsuarioBasico> = {}): UsuarioBasico {
  return {
    id: "cliente-1",
    nombre: "Cliente Uno",
    email: "cliente1@example.com",
    telefono: null,
    rol: "cliente",
    activo: true,
    ...overrides,
  };
}

/**
 * Mismo criterio que `analytics.controller.spec.ts`: `Reflector` REAL leyendo
 * el metadata de `@Roles(...)` del handler real. `handler` nunca se INVOCA
 * acá (solo se lo devuelve vía `getHandler()` para que el Reflector lea su
 * metadata) — `(...args: any[])` a propósito, no `unknown[]`: a diferencia
 * de los handlers sin parámetros de `analytics.controller.spec.ts`, los de
 * este controller SÍ tienen parámetros tipados (`ListarUsuariosQueryDto`,
 * `string`), y TS rechaza pasar esas firmas a un tipo `unknown[]` bajo
 * `strictFunctionTypes` (contravarianza real de parámetros, no bivariante
 * como con sintaxis de método).
 */
function contextoParaHandler(
  handler: (...args: any[]) => unknown,
  usuarioActual: UsuarioAutenticado | undefined,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => AdminUsersController,
    switchToHttp: () => ({ getRequest: () => ({ user: usuarioActual }) }),
  } as unknown as ExecutionContext;
}

describe("AdminUsersController (Épica 16)", () => {
  let repositorio: InMemoryUserRepository;
  let controller: AdminUsersController;
  let guard: RolesGuard;

  beforeEach(() => {
    repositorio = new InMemoryUserRepository();
    controller = new AdminUsersController(
      new ListarUsuariosUseCase(repositorio),
      new ActualizarUsuarioUseCase(repositorio),
    );
    guard = new RolesGuard(new Reflector());
  });

  describe("GET /admin/users", () => {
    it("devuelve la página de usuarios con el envelope de openapi.yaml", async () => {
      repositorio.sembrar(usuarioBasico());
      const resultado = await controller.listar({});

      expect(resultado).toEqual({
        items: [usuarioBasico()],
        total: 1,
        page: 1,
        pageSize: 20,
      });
    });

    it("RolesGuard permite el acceso a admin", () => {
      const contexto = contextoParaHandler(
        AdminUsersController.prototype.listar,
        usuarioAutenticado({ rol: "admin" }),
      );
      expect(guard.canActivate(contexto)).toBe(true);
    });

    it.each<Rol>(["gerente", "almacenista", "repartidor", "cliente"])(
      "RolesGuard deniega con ForbiddenException (403) al rol '%s' — a diferencia del resto del panel-admin, esto es admin-only",
      (rol) => {
        const contexto = contextoParaHandler(AdminUsersController.prototype.listar, usuarioAutenticado({ rol }));
        expect(() => guard.canActivate(contexto)).toThrow(ForbiddenException);
      },
    );
  });

  describe("PATCH /admin/users/{id}", () => {
    it("cambia el rol de un usuario", async () => {
      repositorio.sembrar(usuarioBasico());

      const resultado = await controller.actualizar(
        "cliente-1",
        { rol: "almacenista" },
        usuarioAutenticado(),
      );

      expect(resultado.rol).toBe("almacenista");
    });

    it("desactiva un usuario", async () => {
      repositorio.sembrar(usuarioBasico());

      const resultado = await controller.actualizar("cliente-1", { activo: false }, usuarioAutenticado());

      expect(resultado.activo).toBe(false);
    });

    it('lanza BadRequestException (400) si el body no trae ni "rol" ni "activo"', async () => {
      repositorio.sembrar(usuarioBasico());

      await expect(controller.actualizar("cliente-1", {}, usuarioAutenticado())).rejects.toThrow(
        BadRequestException,
      );
    });

    it("lanza NotFoundException (404) si el id no existe", async () => {
      await expect(
        controller.actualizar("no-existe", { rol: "cliente" }, usuarioAutenticado()),
      ).rejects.toThrow(NotFoundException);
    });

    it("lanza ForbiddenException (403) si el admin intenta modificarse a sí mismo", async () => {
      repositorio.sembrar(usuarioBasico({ id: "admin-1", rol: "admin" }));

      await expect(
        controller.actualizar("admin-1", { rol: "cliente" }, usuarioAutenticado({ id: "admin-1" })),
      ).rejects.toThrow(ForbiddenException);
    });

    it("RolesGuard permite el acceso a admin", () => {
      const contexto = contextoParaHandler(
        AdminUsersController.prototype.actualizar,
        usuarioAutenticado({ rol: "admin" }),
      );
      expect(guard.canActivate(contexto)).toBe(true);
    });

    it.each<Rol>(["gerente", "almacenista", "repartidor", "cliente"])(
      "RolesGuard deniega con ForbiddenException (403) al rol '%s'",
      (rol) => {
        const contexto = contextoParaHandler(
          AdminUsersController.prototype.actualizar,
          usuarioAutenticado({ rol }),
        );
        expect(() => guard.canActivate(contexto)).toThrow(ForbiddenException);
      },
    );
  });
});
