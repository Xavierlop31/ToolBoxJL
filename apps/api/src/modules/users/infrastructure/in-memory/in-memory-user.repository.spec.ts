import { InMemoryUserRepository } from "./in-memory-user.repository";

describe("InMemoryUserRepository", () => {
  it("buscarPorId devuelve null si no fue sembrado", async () => {
    const repo = new InMemoryUserRepository();

    expect(await repo.buscarPorId("no-existe")).toBeNull();
  });

  it("sembrar + buscarPorId devuelve el usuario sembrado", async () => {
    const repo = new InMemoryUserRepository();
    repo.sembrar({
      id: "usuario-1",
      nombre: "Ana Cliente",
      email: "ana@toolboxjl.test",
      telefono: "+573001234567",
      rol: "cliente",
      activo: true,
    });

    const encontrado = await repo.buscarPorId("usuario-1");

    expect(encontrado?.nombre).toBe("Ana Cliente");
    expect(encontrado?.rol).toBe("cliente");
  });

  it("limpiar borra todos los usuarios sembrados", async () => {
    const repo = new InMemoryUserRepository();
    repo.sembrar({
      id: "usuario-1",
      nombre: "Ana Cliente",
      email: "ana@toolboxjl.test",
      telefono: null,
      rol: "cliente",
      activo: true,
    });

    repo.limpiar();

    expect(await repo.buscarPorId("usuario-1")).toBeNull();
  });

  describe("listar/actualizar (Épica 16)", () => {
    it("actualizar devuelve null si el id no existe", async () => {
      const repo = new InMemoryUserRepository();
      expect(await repo.actualizar("no-existe", { rol: "admin" })).toBeNull();
    });

    it("actualizar cambia solo los campos pasados, deja el resto igual", async () => {
      const repo = new InMemoryUserRepository();
      repo.sembrar({
        id: "usuario-1",
        nombre: "Ana Cliente",
        email: "ana@toolboxjl.test",
        telefono: null,
        rol: "cliente",
        activo: true,
      });

      const actualizado = await repo.actualizar("usuario-1", { activo: false });

      expect(actualizado).toEqual({
        id: "usuario-1",
        nombre: "Ana Cliente",
        email: "ana@toolboxjl.test",
        telefono: null,
        rol: "cliente",
        activo: false,
      });
    });

    it("listar pagina y devuelve el total sin filtrar", async () => {
      const repo = new InMemoryUserRepository();
      repo.sembrar({ id: "a", nombre: "Ana", email: "a@x.test", telefono: null, rol: "cliente", activo: true });
      repo.sembrar({ id: "b", nombre: "Beto", email: "b@x.test", telefono: null, rol: "admin", activo: true });

      const resultado = await repo.listar({ page: 1, pageSize: 10 });

      expect(resultado.total).toBe(2);
      expect(resultado.items.map((u) => u.id)).toEqual(["a", "b"]); // orden alfabético por nombre
    });
  });
});
