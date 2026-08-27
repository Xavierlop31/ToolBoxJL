import { ShipmentNoEncontradoError } from "./shipment-no-encontrado.error";

describe("ShipmentNoEncontradoError", () => {
  it("se construye con el mensaje esperado y el nombre de la clase", () => {
    const error = new ShipmentNoEncontradoError("shipment-123");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ShipmentNoEncontradoError");
    expect(error.message).toBe('No existe un envío (shipment) con id "shipment-123".');
  });
});
