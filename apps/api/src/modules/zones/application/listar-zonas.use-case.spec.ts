import { ListarZonasUseCase } from "./listar-zonas.use-case";
import { InMemoryZoneRepository } from "../infrastructure/in-memory/in-memory-zone.repository";

describe("ListarZonasUseCase", () => {
  it("sin filtro devuelve las 15 zonas (7 Medellín + 8 Bogotá)", async () => {
    const repositorio = new InMemoryZoneRepository();
    const useCase = new ListarZonasUseCase(repositorio);

    const zonas = await useCase.ejecutar();

    expect(zonas).toHaveLength(15);
  });

  it("filtra por ciudad", async () => {
    const repositorio = new InMemoryZoneRepository();
    const useCase = new ListarZonasUseCase(repositorio);

    const zonasMedellin = await useCase.ejecutar("Medellín");
    const zonasBogota = await useCase.ejecutar("Bogotá");

    expect(zonasMedellin).toHaveLength(7);
    expect(zonasMedellin.every((z) => z.ciudad === "Medellín")).toBe(true);
    expect(zonasBogota).toHaveLength(8);
    expect(zonasBogota.map((z) => z.nombre)).toEqual(
      expect.arrayContaining([
        "Chapinero",
        "Usaquén",
        "Suba",
        "Engativá",
        "Fontibón",
        "Calle 80",
        "Zona Industrial",
        "Centro",
      ]),
    );
  });
});
