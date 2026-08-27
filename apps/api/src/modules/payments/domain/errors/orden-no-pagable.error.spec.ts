import { OrdenNoPagableError } from "./orden-no-pagable.error";

describe("OrdenNoPagableError", () => {
  it("se construye con el mensaje esperado y el nombre de la clase", () => {
    const error = new OrdenNoPagableError("orden-123", "confirmada");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("OrdenNoPagableError");
    expect(error.message).toBe(
      'La orden "orden-123" no se puede pagar: está en estado "confirmada", se esperaba "pendiente_pago".',
    );
  });
});
