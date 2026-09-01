import { BuscarCatalogoUseCase } from "./buscar-catalogo.use-case";
import { InMemoryToolModelRepository } from "../infrastructure/in-memory/in-memory-tool-model.repository";

describe("BuscarCatalogoUseCase", () => {
  async function crearModelos(repositorio: InMemoryToolModelRepository, cantidad: number) {
    for (let i = 0; i < cantidad; i++) {
      await repositorio.crear({
        nombre: `Taladro ${i}`,
        marca: "Bosch",
        categoria: "Taladros",
        tarifa_dia: 10000,
      });
    }
  }

  it("sin page/pageSize devuelve el array completo sin total (compatibilidad con Agentes 2/3)", async () => {
    const repositorio = new InMemoryToolModelRepository();
    await crearModelos(repositorio, 8);
    const useCase = new BuscarCatalogoUseCase(repositorio);

    const resultado = await useCase.ejecutar({});

    expect(resultado.items).toHaveLength(8);
    expect(resultado.total).toBeUndefined();
  });

  it("con page/pageSize devuelve la página pedida y el total real", async () => {
    const repositorio = new InMemoryToolModelRepository();
    await crearModelos(repositorio, 8);
    const useCase = new BuscarCatalogoUseCase(repositorio);

    const resultado = await useCase.ejecutar({ page: 2, pageSize: 6 });

    expect(resultado.items).toHaveLength(2);
    expect(resultado.total).toBe(8);
  });

  it("filtra por categoría además de paginar", async () => {
    const repositorio = new InMemoryToolModelRepository();
    await repositorio.crear({
      nombre: "Taladro",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10000,
    });
    await repositorio.crear({
      nombre: "Sierra",
      marca: "DeWalt",
      categoria: "Sierras",
      tarifa_dia: 15000,
    });

    const useCase = new BuscarCatalogoUseCase(repositorio);
    const resultado = await useCase.ejecutar({ categoria: "Sierras", page: 1, pageSize: 6 });

    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0].nombre).toBe("Sierra");
    expect(resultado.total).toBe(1);
  });
});
