import { randomUUID } from "node:crypto";
import { ActualizarEstadoUnidadUseCase } from "./actualizar-estado-unidad.use-case";
import { InMemoryToolUnitRepository } from "../infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolUnitStatusLogRepository } from "../infrastructure/in-memory/in-memory-tool-unit-status-log.repository";
import { UnidadNoEncontradaError } from "../domain/errors/unidad-no-encontrada.error";

describe("ActualizarEstadoUnidadUseCase", () => {
  async function armar() {
    const unidades = new InMemoryToolUnitRepository();
    const hojaDeVida = new InMemoryToolUnitStatusLogRepository();
    const useCase = new ActualizarEstadoUnidadUseCase(unidades, hojaDeVida);
    const unidad = await unidades.crear({ modeloId: "modelo-1", numeroSerie: "SN-1" });
    return { unidades, hojaDeVida, useCase, unidad };
  }

  it("Sprint 14 (HU-13.3): persiste los datos de la orden de taller al pasar a En Mantenimiento", async () => {
    const { unidades, useCase, unidad } = await armar();

    const entrada = await useCase.ejecutar(unidad.id, "En Mantenimiento", [], "autor-1", {
      tipoMantenimiento: "Preventivo",
      fallaReportada: "Ruido anormal en el motor",
      tecnicoAsignado: "María Gómez",
      costoEstimado: 50000,
      fechaPrevistaFin: "2026-09-15",
    });

    expect(entrada.estado_nuevo).toBe("En Mantenimiento");
    expect(entrada.tipo_mantenimiento).toBe("Preventivo");
    expect(entrada.falla_reportada).toBe("Ruido anormal en el motor");
    expect(entrada.tecnico_asignado).toBe("María Gómez");
    expect(entrada.costo_estimado).toBe(50000);
    expect(entrada.fecha_prevista_fin).toBe("2026-09-15");
    expect(entrada.motivo_baja).toBeNull();

    const actualizada = await unidades.buscarPorId(unidad.id);
    expect(actualizada?.estado).toBe("En Mantenimiento");
  });

  it("Sprint 14 (HU-13.3): persiste motivo_baja al declarar Baja Definitiva", async () => {
    const { useCase, unidad } = await armar();

    const entrada = await useCase.ejecutar(unidad.id, "Dado de Baja", [], "autor-1", {
      motivoBaja: "Daño irreparable, acta de descarte adjunta",
    });

    expect(entrada.estado_nuevo).toBe("Dado de Baja");
    expect(entrada.motivo_baja).toBe("Daño irreparable, acta de descarte adjunta");
    expect(entrada.tipo_mantenimiento).toBeNull();
  });

  it("Sprint 14 (HU-13.3): reintegrar a servicio (Operativo) sin datos de taller", async () => {
    const { unidades, useCase, unidad } = await armar();
    await unidades.actualizarEstado(unidad.id, "En Mantenimiento");

    const entrada = await useCase.ejecutar(unidad.id, "Operativo", [], "autor-1");

    expect(entrada.estado_anterior).toBe("En Mantenimiento");
    expect(entrada.estado_nuevo).toBe("Operativo");
    expect(entrada.tipo_mantenimiento).toBeNull();
    expect(entrada.motivo_baja).toBeNull();
  });

  it("sigue funcionando sin el 5to parámetro (compatibilidad con llamadores anteriores a Sprint 14)", async () => {
    const { useCase, unidad } = await armar();

    const entrada = await useCase.ejecutar(unidad.id, "Excelente", [], "autor-1");

    expect(entrada.estado_nuevo).toBe("Excelente");
  });

  it("lanza UnidadNoEncontradaError si el id de unidad no existe", async () => {
    const { useCase } = await armar();

    await expect(useCase.ejecutar(randomUUID(), "Operativo", [], "autor-1")).rejects.toThrow(
      UnidadNoEncontradaError,
    );
  });
});
