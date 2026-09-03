import { randomUUID } from "node:crypto";
import { InMemoryToolUnitRepository } from "../infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { ConsultarDisponibilidadUseCase } from "./consultar-disponibilidad.use-case";

describe("ConsultarDisponibilidadUseCase", () => {
  let unidades: InMemoryToolUnitRepository;
  let ordenes: InMemoryOrderRepository;
  let useCase: ConsultarDisponibilidadUseCase;

  beforeEach(() => {
    unidades = new InMemoryToolUnitRepository();
    ordenes = new InMemoryOrderRepository();
    useCase = new ConsultarDisponibilidadUseCase(unidades, ordenes);
  });

  it("devuelve 0 disponibles si el modelo no tiene ninguna unidad registrada", async () => {
    const resultado = await useCase.ejecutar(randomUUID(), "2026-09-01", "2026-09-05");

    expect(resultado.unidades_disponibles).toBe(0);
  });

  it("cuenta como disponibles las unidades físicamente sanas sin reservas en el rango", async () => {
    const modeloId = randomUUID();
    await unidades.crear({ modeloId, numeroSerie: "SN-1" });
    await unidades.crear({ modeloId, numeroSerie: "SN-2" });

    const resultado = await useCase.ejecutar(modeloId, "2026-09-01", "2026-09-05");

    expect(resultado.modelo_id).toBe(modeloId);
    expect(resultado.unidades_disponibles).toBe(2);
  });

  it("excluye unidades En Mantenimiento y Dado de Baja del conteo", async () => {
    const modeloId = randomUUID();
    const enMantenimiento = await unidades.crear({ modeloId, numeroSerie: "SN-1" });
    await unidades.actualizarEstado(enMantenimiento.id, "En Mantenimiento");
    const dadaDeBaja = await unidades.crear({ modeloId, numeroSerie: "SN-2" });
    await unidades.actualizarEstado(dadaDeBaja.id, "Dado de Baja");
    await unidades.crear({ modeloId, numeroSerie: "SN-3" });

    const resultado = await useCase.ejecutar(modeloId, "2026-09-01", "2026-09-05");

    expect(resultado.unidades_disponibles).toBe(1);
  });

  it("excluye unidades ya reservadas por otra orden en el rango de fechas solicitado", async () => {
    const modeloId = randomUUID();
    const unidad = await unidades.crear({ modeloId, numeroSerie: "SN-1" });
    await ordenes.crear({
      clienteId: "otro-cliente",
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 40_000 }],
    });

    const resultado = await useCase.ejecutar(modeloId, "2026-09-02", "2026-09-04");

    expect(resultado.unidades_disponibles).toBe(0);
  });

  it("considera disponible una unidad cuya reserva existente no se solapa con el rango solicitado", async () => {
    const modeloId = randomUUID();
    const unidad = await unidades.crear({ modeloId, numeroSerie: "SN-1" });
    await ordenes.crear({
      clienteId: "otro-cliente",
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: unidad.id, tarifaAplicada: 40_000 }],
    });

    const resultado = await useCase.ejecutar(modeloId, "2026-09-10", "2026-09-12");

    expect(resultado.unidades_disponibles).toBe(1);
  });
});
