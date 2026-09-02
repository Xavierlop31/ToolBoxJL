import type { EstadoUnidad, EstadoVisualizacionUnidad } from "@toolboxjl/shared-types";

/**
 * Calcula el estado DE VISUALIZACIÓN de una unidad (Sprint 14, HU-13.1) a
 * partir de su `EstadoUnidad` persistido y de si tiene un `OrderItem`
 * vigente en una Orden `confirmada`/`en_curso` (`enAlquiler`, resuelto por
 * quien invoca esta función — ver `ListarUnidadesUseCase`/
 * `ObtenerMetricasInventarioUseCase`, que cruzan con `OrderRepository`).
 *
 * `Nuevo`/`Excelente` se agrupan bajo `"Operativo"` — ver el doc-comment de
 * `EstadoVisualizacionUnidad` en `@toolboxjl/shared-types` sobre por qué
 * (el enum de visualización del contrato solo declara 4 valores, no 5).
 */
export function calcularEstadoVisualizacionUnidad(
  estado: EstadoUnidad,
  enAlquiler: boolean,
): EstadoVisualizacionUnidad {
  if (estado === "En Mantenimiento") {
    return "En Mantenimiento";
  }
  if (estado === "Dado de Baja") {
    return "Dado de Baja";
  }
  return enAlquiler ? "En Alquiler" : "Operativo";
}
