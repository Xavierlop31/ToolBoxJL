export class OrdenNoEncontradaError extends Error {
  constructor(id: string) {
    super(`No existe una orden con id "${id}".`);
    this.name = "OrdenNoEncontradaError";
  }
}
