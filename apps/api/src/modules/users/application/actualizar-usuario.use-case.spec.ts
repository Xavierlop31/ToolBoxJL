import { ActualizarUsuarioUseCase } from "./actualizar-usuario.use-case";
import { InMemoryUserRepository } from "../infrastructure/in-memory/in-memory-user.repository";
import { NoModificarPropioUsuarioError } from "../domain/errors/no-modificar-propio-usuario.error";
import { UsuarioNoEncontradoError } from "../domain/errors/usuario-no-encontrado.error";
import type { UsuarioBasico } from "../domain/user.repository";

function usuario(overrides: Partial<UsuarioBasico> = {}): UsuarioBasico {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    nombre: "Cliente Uno",
    email: "cliente1@example.com",
    telefono: null,
    rol: "cliente",
    activo: true,
    ...overrides,
  };
}

const ADMIN_ID = "99999999-9999-9999-9999-999999999999";

describe("ActualizarUsuarioUseCase", () => {
  it("cambia el rol de un usuario", async () => {
    const repositorio = new InMemoryUserRepository();
    repositorio.sembrar(usuario());
    const useCase = new ActualizarUsuarioUseCase(repositorio);

    const actualizado = await useCase.ejecutar(usuario().id, ADMIN_ID, { rol: "almacenista" });

    expect(actualizado.rol).toBe("almacenista");
    expect(actualizado.activo).toBe(true); // no lo pasó — queda igual
  });

  it("desactiva un usuario sin tocar su rol", async () => {
    const repositorio = new InMemoryUserRepository();
    repositorio.sembrar(usuario());
    const useCase = new ActualizarUsuarioUseCase(repositorio);

    const actualizado = await useCase.ejecutar(usuario().id, ADMIN_ID, { activo: false });

    expect(actualizado.activo).toBe(false);
    expect(actualizado.rol).toBe("cliente");
  });

  it("lanza NoModificarPropioUsuarioError si el admin intenta cambiarse a sí mismo", async () => {
    const repositorio = new InMemoryUserRepository();
    repositorio.sembrar(usuario({ id: ADMIN_ID, rol: "admin" }));
    const useCase = new ActualizarUsuarioUseCase(repositorio);

    await expect(useCase.ejecutar(ADMIN_ID, ADMIN_ID, { rol: "cliente" })).rejects.toThrow(
      NoModificarPropioUsuarioError,
    );
  });

  it("lanza UsuarioNoEncontradoError si el id no existe", async () => {
    const repositorio = new InMemoryUserRepository();
    const useCase = new ActualizarUsuarioUseCase(repositorio);

    await expect(useCase.ejecutar("no-existe", ADMIN_ID, { rol: "cliente" })).rejects.toThrow(
      UsuarioNoEncontradoError,
    );
  });
});
