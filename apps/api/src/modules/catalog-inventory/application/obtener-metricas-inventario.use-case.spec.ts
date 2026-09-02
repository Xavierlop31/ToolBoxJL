import { ObtenerMetricasInventarioUseCase } from "./obtener-metricas-inventario.use-case";
import { InMemoryToolUnitRepository } from "../infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";

describe("ObtenerMetricasInventarioUseCase", () => {
  it("calcula los 4 conteos, con el mismo cruce con Órdenes que ListarUnidadesUseCase", async () => {
    const unidades = new InMemoryToolUnitRepository();
    const ordenes = new InMemoryOrderRepository();
    const useCase = new ObtenerMetricasInventarioUseCase(unidades, ordenes);

    await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-1" });
    await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-2" });
    const enMantenimiento = await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-3" });
    await unidades.actualizarEstado(enMantenimiento.id, "En Mantenimiento");
    const dadaDeBaja = await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-4" });
    await unidades.actualizarEstado(dadaDeBaja.id, "Dado de Baja");
    const enAlquiler = await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-5" });

    const orden = await ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: "zona-1",
      items: [{ unidadId: enAlquiler.id, tarifaAplicada: 10000 }],
    });
    await ordenes.actualizarEstado(orden.id, "en_curso");

    const metricas = await useCase.ejecutar();

    expect(metricas.total_unidades).toBe(5);
    expect(metricas.operativas).toBe(2);
    expect(metricas.en_alquiler).toBe(1);
    expect(metricas.en_mantenimiento_o_baja).toBe(2);
    expect(
      metricas.operativas + metricas.en_alquiler + metricas.en_mantenimiento_o_baja,
    ).toBe(metricas.total_unidades);
  });

  it("devuelve todo en 0 cuando no hay unidades registradas", async () => {
    const unidades = new InMemoryToolUnitRepository();
    const ordenes = new InMemoryOrderRepository();
    const useCase = new ObtenerMetricasInventarioUseCase(unidades, ordenes);

    const metricas = await useCase.ejecutar();

    expect(metricas).toEqual({
      total_unidades: 0,
      operativas: 0,
      en_alquiler: 0,
      en_mantenimiento_o_baja: 0,
    });
  });
});
