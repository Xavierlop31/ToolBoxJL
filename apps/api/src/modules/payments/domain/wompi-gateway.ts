import type { MetodoPago } from "@toolboxjl/shared-types";

/**
 * Puerto de gateway de pagos — mismo criterio de Clean Architecture que los
 * repositorios: el dominio declara la interfaz, `infrastructure/wompi` la
 * implementa dos veces (real contra Wompi sandbox / fake determinístico
 * para tests-BDD).
 *
 * `MetodoPagoWompi` excluye "contra_entrega" a propósito: el pago contra
 * entrega es dinero físico que todavía no existe y nunca dispara una
 * llamada (real ni simulada) a Wompi — ver PagarOrdenUseCase.
 */
export type MetodoPagoWompi = Extract<MetodoPago, "pse" | "tarjeta">;

/** "captura" = cobro definitivo; "hold" = preautorización (depósito con tarjeta). */
export type ModoTransaccionWompi = "captura" | "hold";

export interface ResultadoTransaccionWompi {
  wompiTransactionId: string;
  estado: "capturado" | "hold";
}

export interface ResultadoSplitWompi {
  montoLogistica: number;
  montoMatriz: number;
}

export interface WompiGateway {
  iniciarTransaccion(
    monto: number,
    metodo: MetodoPagoWompi,
    modo: ModoTransaccionWompi,
  ): Promise<ResultadoTransaccionWompi>;

  /**
   * Simula el split de pago entre la cuenta matriz y la del proveedor
   * logístico (RF-2.4, HU-3.3) — no hay spec de cuentas/porcentajes reales
   * de Wompi todavía, así que el % se toma de una constante configurable
   * (ver infrastructure/config/wompi.config.ts).
   */
  simularSplit(recargoLogistico: number): ResultadoSplitWompi;
}
