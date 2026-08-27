import { MoraNoEncontradaError } from "./mora-no-encontrada.error";

describe("MoraNoEncontradaError", () => {
  it("se construye con el mensaje esperado y el nombre de la clase", () => {
    const error = new MoraNoEncontradaError("orden-123");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("MoraNoEncontradaError");
    expect(error.message).toBe('No hay comprobante de mora emitido para la orden "orden-123".');
  });
});
