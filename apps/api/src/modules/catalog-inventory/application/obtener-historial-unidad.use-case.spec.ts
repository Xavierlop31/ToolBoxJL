import { ObtenerHistorialUnidadUseCase } from "./obtener-historial-unidad.use-case";
import { UnidadNoEncontradaError } from "../domain/errors/unidad-no-encontrada.error";
import { InMemoryToolUnitRepository } from "../infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolUnitStatusLogRepository } from "../infrastructure/in-memory/in-memory-tool-unit-status-log.repository";

describe("ObtenerHistorialUnidadUseCase", () => {
  async function armar() {
    const unidades = new InMemoryToolUnitRepository();
    const hojaDeVida = new InMemoryToolUnitStatusLogRepository();
    const useCase = new ObtenerHistorialUnidadUseCase(unidades, hojaDeVida);
    const unidad = await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-1" });
    return { unidades, hojaDeVida, useCase, unidad };
  }

  it("devuelve la hoja de vida completa en orden cronológico descendente", async () => {
    const { hojaDeVida, useCase, unidad } = await armar();

    const primera = await hojaDeVida.crear({
      unidadId: unidad.id,
      estadoAnterior: "Nuevo",
      estadoNuevo: "Operativo",
      fotosUrls: [],
      autorId: "autor-1",
    });
    const segunda = await hojaDeVida.crear({
      unidadId: unidad.id,
      estadoAnterior: "Operativo",
      estadoNuevo: "En Mantenimiento",
      fotosUrls: [],
      autorId: "autor-1",
      tipoMantenimiento: "Correctivo",
    });

    const historial = await useCase.ejecutar(unidad.id);

    expect(historial).toHaveLength(2);
    expect(historial[0].id).toBe(segunda.id); // más reciente primero
    expect(historial[1].id).toBe(primera.id);
  });

  it("devuelve un array vacío para una unidad sin hoja de vida", async () => {
    const { useCase, unidad } = await armar();

    const historial = await useCase.ejecutar(unidad.id);

    expect(historial).toEqual([]);
  });

  it("propaga UnidadNoEncontradaError si la unidad no existe", async () => {
    const { useCase } = await armar();

    await expect(useCase.ejecutar("no-existe")).rejects.toThrow(UnidadNoEncontradaError);
  });
});
