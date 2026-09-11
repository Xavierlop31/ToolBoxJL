import { InMemoryToolModelRepository } from "../infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryToolUnitRepository } from "../infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolUnitStatusLogRepository } from "../infrastructure/in-memory/in-memory-tool-unit-status-log.repository";
import { ObtenerAuditoriaRecienteUseCase } from "./obtener-auditoria-reciente.use-case";

describe("ObtenerAuditoriaRecienteUseCase", () => {
  let modelos: InMemoryToolModelRepository;
  let unidades: InMemoryToolUnitRepository;
  let hojaDeVida: InMemoryToolUnitStatusLogRepository;
  let useCase: ObtenerAuditoriaRecienteUseCase;

  beforeEach(() => {
    modelos = new InMemoryToolModelRepository();
    unidades = new InMemoryToolUnitRepository();
    hojaDeVida = new InMemoryToolUnitStatusLogRepository();
    useCase = new ObtenerAuditoriaRecienteUseCase(hojaDeVida, unidades, modelos);
  });

  it("enriquece cada evento con numero_serie y modelo_nombre de la unidad", async () => {
    const modelo = await modelos.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
    await hojaDeVida.crear({
      unidadId: unidad.id,
      estadoAnterior: "Nuevo",
      estadoNuevo: "Operativo",
      fotosUrls: [],
      autorId: "usuario-1",
    });

    const resultado = await useCase.ejecutar();

    expect(resultado).toHaveLength(1);
    expect(resultado[0].numero_serie).toBe("SN-1");
    expect(resultado[0].modelo_nombre).toBe("Taladro Percutor");
    expect(resultado[0].estado_nuevo).toBe("Operativo");
  });

  it("respeta el límite pedido y no supera el máximo de 50", async () => {
    const modelo = await modelos.crear({
      nombre: "Sierra",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
    for (let i = 0; i < 5; i++) {
      await hojaDeVida.crear({
        unidadId: unidad.id,
        estadoAnterior: "Operativo",
        estadoNuevo: "Operativo",
        fotosUrls: [],
        autorId: "usuario-1",
      });
    }

    const resultado = await useCase.ejecutar(2);
    expect(resultado).toHaveLength(2);

    const resultadoSobreElMaximo = await useCase.ejecutar(1000);
    expect(resultadoSobreElMaximo.length).toBeLessThanOrEqual(50);
  });

  it("usa 10 como límite por defecto si no se pasa ninguno", async () => {
    const modelo = await modelos.crear({
      nombre: "Amoladora",
      marca: "Makita",
      categoria: "Amoladoras",
      tarifa_dia: 6_000,
    });
    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-1" });
    for (let i = 0; i < 12; i++) {
      await hojaDeVida.crear({
        unidadId: unidad.id,
        estadoAnterior: "Operativo",
        estadoNuevo: "Operativo",
        fotosUrls: [],
        autorId: "usuario-1",
      });
    }

    const resultado = await useCase.ejecutar();

    expect(resultado).toHaveLength(10);
  });

  it("devuelve numero_serie/modelo_nombre vacíos si la unidad ya no se encuentra (defensivo)", async () => {
    await hojaDeVida.crear({
      unidadId: "unidad-fantasma",
      estadoAnterior: "Operativo",
      estadoNuevo: "Dado de Baja",
      fotosUrls: [],
      autorId: "usuario-1",
      motivoBaja: "Robada",
    });

    const resultado = await useCase.ejecutar();

    expect(resultado[0].numero_serie).toBe("");
    expect(resultado[0].modelo_nombre).toBe("");
    expect(resultado[0].motivo_baja).toBe("Robada");
  });
});
