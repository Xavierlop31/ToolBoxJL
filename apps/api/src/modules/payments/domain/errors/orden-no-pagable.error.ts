export class OrdenNoPagableError extends Error {
  constructor(ordenId: string, estadoActual: string) {
    super(
      `La orden "${ordenId}" no se puede pagar: está en estado "${estadoActual}", se esperaba "pendiente_pago".`,
    );
    this.name = "OrdenNoPagableError";
  }
}
