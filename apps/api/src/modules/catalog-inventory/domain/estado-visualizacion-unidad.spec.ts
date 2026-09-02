import { calcularEstadoVisualizacionUnidad } from "./estado-visualizacion-unidad";

describe("calcularEstadoVisualizacionUnidad", () => {
  it('devuelve "En Mantenimiento" sin importar el cruce con Órdenes', () => {
    expect(calcularEstadoVisualizacionUnidad("En Mantenimiento", true)).toBe(
      "En Mantenimiento",
    );
    expect(calcularEstadoVisualizacionUnidad("En Mantenimiento", false)).toBe(
      "En Mantenimiento",
    );
  });

  it('devuelve "Dado de Baja" sin importar el cruce con Órdenes', () => {
    expect(calcularEstadoVisualizacionUnidad("Dado de Baja", true)).toBe("Dado de Baja");
    expect(calcularEstadoVisualizacionUnidad("Dado de Baja", false)).toBe("Dado de Baja");
  });

  it('devuelve "En Alquiler" para "Operativo" con una orden vigente', () => {
    expect(calcularEstadoVisualizacionUnidad("Operativo", true)).toBe("En Alquiler");
  });

  it('devuelve "Operativo" para "Operativo" sin orden vigente', () => {
    expect(calcularEstadoVisualizacionUnidad("Operativo", false)).toBe("Operativo");
  });

  it('agrupa "Nuevo"/"Excelente" bajo "Operativo" (sin orden vigente)', () => {
    expect(calcularEstadoVisualizacionUnidad("Nuevo", false)).toBe("Operativo");
    expect(calcularEstadoVisualizacionUnidad("Excelente", false)).toBe("Operativo");
  });

  it('agrupa "Nuevo"/"Excelente" bajo "En Alquiler" cuando tienen orden vigente', () => {
    expect(calcularEstadoVisualizacionUnidad("Nuevo", true)).toBe("En Alquiler");
    expect(calcularEstadoVisualizacionUnidad("Excelente", true)).toBe("En Alquiler");
  });
});
