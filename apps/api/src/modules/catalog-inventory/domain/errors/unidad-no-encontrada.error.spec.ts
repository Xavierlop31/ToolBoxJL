import { UnidadNoEncontradaError } from "./unidad-no-encontrada.error";

describe("UnidadNoEncontradaError", () => {
  it("se construye con el mensaje esperado y el nombre de la clase", () => {
    const error = new UnidadNoEncontradaError("unidad-123");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("UnidadNoEncontradaError");
    expect(error.message).toBe('No existe una unidad física con id "unidad-123".');
  });
});
