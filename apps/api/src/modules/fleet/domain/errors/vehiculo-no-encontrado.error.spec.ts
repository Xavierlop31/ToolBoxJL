import { VehiculoNoEncontradoError } from "./vehiculo-no-encontrado.error";

describe("VehiculoNoEncontradoError", () => {
  it("se construye con el mensaje esperado y el nombre de la clase", () => {
    const error = new VehiculoNoEncontradoError("vehiculo-123");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("VehiculoNoEncontradoError");
    expect(error.message).toBe('No existe un vehículo con id "vehiculo-123".');
  });
});
