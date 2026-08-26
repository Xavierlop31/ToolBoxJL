import { SesionesActivas } from "./sesiones-activas";

describe("SesionesActivas", () => {
  it("una sala nueva no está activa hasta que se marca", () => {
    const sesiones = new SesionesActivas();
    expect(sesiones.estaActiva("sala-1")).toBe(false);
    sesiones.marcarActiva("sala-1");
    expect(sesiones.estaActiva("sala-1")).toBe(true);
    expect(sesiones.cantidadActivas).toBe(1);
  });

  it("marcarActiva es idempotente (no duplica el conteo)", () => {
    const sesiones = new SesionesActivas();
    sesiones.marcarActiva("sala-1");
    sesiones.marcarActiva("sala-1");
    expect(sesiones.cantidadActivas).toBe(1);
  });

  it("marcarFinalizada libera la sala para que se pueda volver a unir", () => {
    const sesiones = new SesionesActivas();
    sesiones.marcarActiva("sala-1");
    sesiones.marcarFinalizada("sala-1");
    expect(sesiones.estaActiva("sala-1")).toBe(false);
    expect(sesiones.cantidadActivas).toBe(0);
  });
});
