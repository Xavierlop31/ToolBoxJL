import { ListarMantenimientoUseCase } from "./listar-mantenimiento.use-case";
import { InMemoryToolUnitRepository } from "../infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolModelRepository } from "../infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryToolUnitStatusLogRepository } from "../infrastructure/in-memory/in-memory-tool-unit-status-log.repository";
import { QrCodeGeneratorService } from "../infrastructure/qr/qrcode-generator.service";

describe("ListarMantenimientoUseCase", () => {
  async function armar() {
    const unidades = new InMemoryToolUnitRepository();
    const modelos = new InMemoryToolModelRepository();
    const hojaDeVida = new InMemoryToolUnitStatusLogRepository();
    const qr = new QrCodeGeneratorService();
    const useCase = new ListarMantenimientoUseCase(unidades, modelos, hojaDeVida, qr);

    const modelo = await modelos.crear({
      nombre: "Amoladora Angular AG-100",
      marca: "DeWalt",
      categoria: "Amoladoras",
      tarifa_dia: 25000,
    });

    return { unidades, modelos, hojaDeVida, useCase, modelo };
  }

  it("solo incluye unidades En Mantenimiento o Dado de Baja", async () => {
    const { unidades, useCase, modelo } = await armar();

    await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-OP" });
    const enTaller = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-TALLER" });
    await unidades.actualizarEstado(enTaller.id, "En Mantenimiento");

    const resultado = await useCase.ejecutar();

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe(enTaller.id);
    expect(resultado[0].modelo_nombre).toBe(modelo.nombre);
  });

  it("expone el evento de hoja de vida más reciente con campos de mantenimiento poblados", async () => {
    const { unidades, hojaDeVida, useCase, modelo } = await armar();

    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-TALLER-2" });
    await unidades.actualizarEstado(unidad.id, "En Mantenimiento");

    // Entrada SIN campos de mantenimiento (ej. un cambio de estado previo,
    // Sprint 1) — no debe ganarle a la entrada con campos poblados de abajo,
    // aunque sea más reciente en el tiempo simulado.
    await hojaDeVida.crear({
      unidadId: unidad.id,
      estadoAnterior: "Nuevo",
      estadoNuevo: "Operativo",
      fotosUrls: [],
      autorId: "autor-1",
    });

    const entradaConDatos = await hojaDeVida.crear({
      unidadId: unidad.id,
      estadoAnterior: "Operativo",
      estadoNuevo: "En Mantenimiento",
      fotosUrls: [],
      autorId: "autor-1",
      tipoMantenimiento: "Correctivo",
      fallaReportada: "Motor no enciende",
      tecnicoAsignado: "Juan Pérez",
      costoEstimado: 80000,
      fechaPrevistaFin: "2026-09-10",
    });

    const resultado = await useCase.ejecutar();

    const fila = resultado.find((u) => u.id === unidad.id);
    expect(fila?.ultimo_evento_mantenimiento?.id).toBe(entradaConDatos.id);
    expect(fila?.ultimo_evento_mantenimiento?.tipo_mantenimiento).toBe("Correctivo");
    expect(fila?.ultimo_evento_mantenimiento?.falla_reportada).toBe("Motor no enciende");
  });

  it("incluye unidades dadas de baja, con motivo_baja en su último evento", async () => {
    const { unidades, hojaDeVida, useCase, modelo } = await armar();

    const unidad = await unidades.crear({ modeloId: modelo.id, numeroSerie: "SN-BAJA" });
    await unidades.actualizarEstado(unidad.id, "Dado de Baja");
    await hojaDeVida.crear({
      unidadId: unidad.id,
      estadoAnterior: "En Mantenimiento",
      estadoNuevo: "Dado de Baja",
      fotosUrls: [],
      autorId: "autor-1",
      motivoBaja: "Daño irreparable en el motor",
    });

    const resultado = await useCase.ejecutar();

    const fila = resultado.find((u) => u.id === unidad.id);
    expect(fila).toBeDefined();
    expect(fila?.estado).toBe("Dado de Baja");
    expect(fila?.ultimo_evento_mantenimiento?.motivo_baja).toBe("Daño irreparable en el motor");
  });
});
