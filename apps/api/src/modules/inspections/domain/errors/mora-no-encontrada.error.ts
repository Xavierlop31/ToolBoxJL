/**
 * Se lanza cuando `GET /billing/mora/{orderId}` se consulta para una orden
 * que existe pero para la que el `MoraCalculatorJob` todavía no emitió
 * ningún comprobante (`Payment` de `tipo: "cobro_mora"`) — openapi.yaml
 * declara 404 para este caso.
 */
export class MoraNoEncontradaError extends Error {
  constructor(orderId: string) {
    super(`No hay comprobante de mora emitido para la orden "${orderId}".`);
    this.name = "MoraNoEncontradaError";
  }
}
