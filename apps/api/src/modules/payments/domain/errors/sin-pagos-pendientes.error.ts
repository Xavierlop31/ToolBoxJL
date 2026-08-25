export class SinPagosPendientesError extends Error {
  constructor(ordenId: string) {
    super(
      `La orden "${ordenId}" no tiene pagos en estado "pendiente" para confirmar contra entrega.`,
    );
    this.name = "SinPagosPendientesError";
  }
}
