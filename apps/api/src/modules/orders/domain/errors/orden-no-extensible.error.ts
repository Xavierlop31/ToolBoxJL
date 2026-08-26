export class OrdenNoExtensibleError extends Error {
  constructor(ordenId: string, motivo: string) {
    super(`La orden "${ordenId}" no se puede extender: ${motivo}.`);
    this.name = "OrdenNoExtensibleError";
  }
}
