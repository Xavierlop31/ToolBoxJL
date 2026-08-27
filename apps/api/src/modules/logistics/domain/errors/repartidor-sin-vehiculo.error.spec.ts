import { RepartidorSinVehiculoError } from "./repartidor-sin-vehiculo.error";

describe("RepartidorSinVehiculoError", () => {
  it("se construye con el mensaje esperado y el nombre de la clase", () => {
    const error = new RepartidorSinVehiculoError("repartidor-123");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("RepartidorSinVehiculoError");
    expect(error.message).toBe('El repartidor con id "repartidor-123" no tiene un vehículo asignado.');
  });
});
