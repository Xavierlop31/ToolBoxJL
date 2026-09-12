import { InMemoryToolUnitRepository } from "../infrastructure/in-memory/in-memory-tool-unit.repository";
import { ObtenerOcupacionAlmacenUseCase } from "./obtener-ocupacion-almacen.use-case";

describe("ObtenerOcupacionAlmacenUseCase", () => {
  let unidades: InMemoryToolUnitRepository;
  let useCase: ObtenerOcupacionAlmacenUseCase;

  beforeEach(() => {
    unidades = new InMemoryToolUnitRepository();
    useCase = new ObtenerOcupacionAlmacenUseCase(unidades);
  });

  it("agrupa unidades por ubicacion_bodega y cuenta, ordenado descendente por cantidad", async () => {
    await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-1", ubicacionBodega: "Estante A" });
    await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-2", ubicacionBodega: "Estante A" });
    await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-3", ubicacionBodega: "Estante B" });

    const resultado = await useCase.ejecutar();

    expect(resultado).toEqual([
      { ubicacion: "Estante A", cantidad: 2 },
      { ubicacion: "Estante B", cantidad: 1 },
    ]);
  });

  it('agrupa unidades sin ubicación bajo "Sin ubicación asignada"', async () => {
    await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-1" });
    await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-2", ubicacionBodega: "  " });

    const resultado = await useCase.ejecutar();

    expect(resultado).toEqual([{ ubicacion: "Sin ubicación asignada", cantidad: 2 }]);
  });

  it("devuelve un arreglo vacío si no hay unidades", async () => {
    const resultado = await useCase.ejecutar();

    expect(resultado).toEqual([]);
  });
});
