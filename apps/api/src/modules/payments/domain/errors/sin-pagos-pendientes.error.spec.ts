import { SinPagosPendientesError } from "./sin-pagos-pendientes.error";

describe("SinPagosPendientesError", () => {
  it("se construye con el mensaje esperado y el nombre de la clase", () => {
    const error = new SinPagosPendientesError("orden-123");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("SinPagosPendientesError");
    expect(error.message).toBe(
      'La orden "orden-123" no tiene pagos en estado "pendiente" para confirmar contra entrega.',
    );
  });
});
