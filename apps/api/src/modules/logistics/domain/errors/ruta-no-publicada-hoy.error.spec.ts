import { RutaNoPublicadaHoyError } from "./ruta-no-publicada-hoy.error";

describe("RutaNoPublicadaHoyError", () => {
  it("se construye con el mensaje esperado y el nombre de la clase", () => {
    const error = new RutaNoPublicadaHoyError("vehiculo-123", "2026-08-27");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("RutaNoPublicadaHoyError");
    expect(error.message).toBe(
      'No hay ninguna ruta publicada para el vehículo "vehiculo-123" en la fecha "2026-08-27".',
    );
  });
});
