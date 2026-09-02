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
    });

    repo.limpiar();

    expect(await repo.buscarPorId("usuario-1")).toBeNull();
  });
});
