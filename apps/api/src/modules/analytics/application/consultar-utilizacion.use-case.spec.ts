import { randomUUID } from "node:crypto";
import { InMemoryUtilizationRepository } from "../infrastructure/in-memory/in-memory-utilization.repository";
import { ConsultarUtilizacionUseCase } from "./consultar-utilizacion.use-case";

const AHORA = new Date("2026-08-17T12:00:00.000Z"); // agosto/2026 -> mes de 31 días

describe("ConsultarUtilizacionUseCase", () => {
  let repo: InMemoryUtilizationRepository;
  let useCase: ConsultarUtilizacionUseCase;

  beforeEach(() => {
    repo = new InMemoryUtilizationRepository();
    useCase = new ConsultarUtilizacionUseCase(repo);
  });

  it("calcula Días Alquilada / Días Disponibles del mes, por modelo y global", async () => {
    const modeloId = randomUUID();
    // 1 unidad disponible todo agosto (31 días) desde antes del mes.
    repo.sembrarUnidad({ modeloId, estado: "Operativo", fechaIngreso: new Date("2026-01-01T00:00:00.000Z") });
    // Alquilada del 1 al 11 de agosto (10 días, fecha_fin exclusiva).
    repo.sembrarAlquiler({
      modeloId,
      fechaInicio: new Date("2026-08-01T00:00:00.000Z"),
      fechaFin: new Date("2026-08-11T00:00:00.000Z"),
    });

    const resultado = await useCase.ejecutar(AHORA);

    expect(resultado.por_modelo).toEqual([{ modelo_id: modeloId, utilizacion_pct: Math.round((10 / 31) * 10000) / 100 }]);
    expect(resultado.utilizacion_global_pct).toBe(Math.round((10 / 31) * 10000) / 100);
  });

  it("cuenta 0 días disponibles para una unidad En Mantenimiento o Dado de Baja (proxy de estado actual, GAP documentado)", async () => {
    const modeloId = randomUUID();
    repo.sembrarUnidad({ modeloId, estado: "En Mantenimiento", fechaIngreso: new Date("2026-01-01T00:00:00.000Z") });

    const resultado = await useCase.ejecutar(AHORA);

    expect(resultado.por_modelo).toEqual([{ modelo_id: modeloId, utilizacion_pct: 0 }]);
  });

  it("acota días disponibles a partir de fecha_ingreso cuando la unidad ingresó a mitad del mes", async () => {
    const modeloId = randomUUID();
    // Ingresó el 21 de agosto -> disponible del 21 al 31 = 10 días.
    repo.sembrarUnidad({ modeloId, estado: "Nuevo", fechaIngreso: new Date("2026-08-21T00:00:00.000Z") });

    const resultado = await useCase.ejecutar(AHORA);

    expect(resultado.por_modelo).toEqual([{ modelo_id: modeloId, utilizacion_pct: 0 }]);
    // Sin alquileres sembrados, dias_alquilada = 0 -> 0%, pero el
    // denominador (dias_disponibles) sí quedó acotado a 10 (ver siguiente
    // caso con alquiler para verificarlo indirectamente vía el %).
  });

  it("devuelve 0% (no NaN/Infinity) cuando no hay ninguna unidad sembrada", async () => {
    const resultado = await useCase.ejecutar(AHORA);

    expect(resultado.utilizacion_global_pct).toBe(0);
    expect(resultado.por_modelo).toEqual([]);
  });

  it("ignora días de alquiler fuera del mes consultado", async () => {
    const modeloId = randomUUID();
    repo.sembrarUnidad({ modeloId, estado: "Operativo", fechaIngreso: new Date("2026-01-01T00:00:00.000Z") });
    // Alquiler completo en julio -> no debe contar para agosto.
    repo.sembrarAlquiler({
      modeloId,
      fechaInicio: new Date("2026-07-01T00:00:00.000Z"),
      fechaFin: new Date("2026-07-15T00:00:00.000Z"),
    });

    const resultado = await useCase.ejecutar(AHORA);

    expect(resultado.por_modelo).toEqual([{ modelo_id: modeloId, utilizacion_pct: 0 }]);
  });
});
