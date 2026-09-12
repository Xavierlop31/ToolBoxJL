import { ListarUsuariosUseCase } from "./listar-usuarios.use-case";
import { InMemoryUserRepository } from "../infrastructure/in-memory/in-memory-user.repository";
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

describe("ListarUsuariosUseCase", () => {
  it("pagina en bloques de 20 por defecto, orden alfabético por nombre", async () => {
    const repositorio = new InMemoryUserRepository();
    for (let i = 0; i < 25; i++) {
      repositorio.sembrar(
        usuario({ id: `id-${i}`, nombre: `Usuario ${String(i).padStart(2, "0")}`, email: `u${i}@example.com` }),
      );
    }

    const useCase = new ListarUsuariosUseCase(repositorio);
    const pagina1 = await useCase.ejecutar({});
    const pagina2 = await useCase.ejecutar({ page: 2 });

    expect(pagina1.pageSize).toBe(20);
    expect(pagina1.items).toHaveLength(20);
    expect(pagina1.total).toBe(25);
    expect(pagina1.items[0].nombre).toBe("Usuario 00");

    expect(pagina2.items).toHaveLength(5);
  });

  it("filtra por rol", async () => {
    const repositorio = new InMemoryUserRepository();
    repositorio.sembrar(usuario({ id: "a", rol: "admin", nombre: "Ana Admin" }));
    repositorio.sembrar(usuario({ id: "b", rol: "cliente", nombre: "Beto Cliente" }));

    const useCase = new ListarUsuariosUseCase(repositorio);
    const resultado = await useCase.ejecutar({ rol: "admin" });

    expect(resultado.total).toBe(1);
    expect(resultado.items[0].id).toBe("a");
  });

  it("filtra por activo", async () => {
    const repositorio = new InMemoryUserRepository();
    repositorio.sembrar(usuario({ id: "a", activo: true }));
    repositorio.sembrar(usuario({ id: "b", activo: false, email: "b@example.com" }));

    const useCase = new ListarUsuariosUseCase(repositorio);
    const resultado = await useCase.ejecutar({ activo: false });

    expect(resultado.total).toBe(1);
    expect(resultado.items[0].id).toBe("b");
  });

  it("filtra por búsqueda libre (nombre o email, sin distinguir mayúsculas)", async () => {
    const repositorio = new InMemoryUserRepository();
    repositorio.sembrar(usuario({ id: "a", nombre: "Javier Lopez", email: "jlopez@example.com" }));
    repositorio.sembrar(usuario({ id: "b", nombre: "Otro Usuario", email: "otro@example.com" }));

    const useCase = new ListarUsuariosUseCase(repositorio);
    const resultado = await useCase.ejecutar({ q: "JAVIER" });

    expect(resultado.total).toBe(1);
    expect(resultado.items[0].id).toBe("a");
  });
});
