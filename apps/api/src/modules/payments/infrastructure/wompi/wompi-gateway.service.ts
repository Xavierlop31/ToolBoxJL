import { Injectable } from "@nestjs/common";
import type {
  MetodoPagoWompi,
  ModoTransaccionWompi,
  ResultadoSplitWompi,
  ResultadoTransaccionWompi,
  WompiGateway,
} from "../../domain/wompi-gateway";
import { loadSplitLogisticaPct, loadWompiCredentials } from "../config/wompi.config";

/**
 * Implementación real contra Wompi sandbox (https://sandbox.wompi.co/v1).
 *
 * *** NUNCA FUE PROBADA CONTRA LA API REAL DE WOMPI *** — este entorno de
 * desarrollo no tiene credenciales de sandbox (WOMPI_PRIVATE_KEY/
 * WOMPI_PUBLIC_KEY). El mapeo de campos del request (amount_in_cents,
 * payment_method_type, capture_method, ...) sigue la documentación pública
 * de Wompi para transacciones (POST /transactions) pero no fue validado
 * end-to-end — mismo criterio que schema.prisma/migrations respecto a
 * `DATABASE_URL`. Es responsabilidad de quien tenga credenciales de sandbox
 * (Tech Lead / DevOps) validar y ajustar este mapeo antes de un despliegue
 * real. Para tests/BDD, usá InMemoryWompiGateway — no requiere credenciales.
 */
@Injectable()
export class WompiGatewayService implements WompiGateway {
  private static readonly BASE_URL = "https://sandbox.wompi.co/v1";

  private readonly privateKey: string;
  private readonly splitLogisticaPct: number;

  constructor() {
    const credenciales = loadWompiCredentials();
    this.privateKey = credenciales.privateKey;
    this.splitLogisticaPct = loadSplitLogisticaPct();
  }

  async iniciarTransaccion(
    monto: number,
    metodo: MetodoPagoWompi,
    modo: ModoTransaccionWompi,
  ): Promise<ResultadoTransaccionWompi> {
    const response = await fetch(`${WompiGatewayService.BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.privateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount_in_cents: monto * 100,
        currency: "COP",
        payment_method_type: metodo === "tarjeta" ? "CARD" : "PSE",
        capture_method: modo === "hold" ? "manual" : "automatic",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Wompi sandbox respondió ${response.status} al iniciar la transacción (metodo: ${metodo}, modo: ${modo}).`,
      );
    }

    const body = (await response.json()) as { data?: { id?: string } };
    const wompiTransactionId = body.data?.id;
    if (!wompiTransactionId) {
      throw new Error("Wompi sandbox no devolvió un id de transacción.");
    }

    return {
      wompiTransactionId,
      estado: modo === "hold" ? "hold" : "capturado",
    };
  }

  simularSplit(recargoLogistico: number): ResultadoSplitWompi {
    const montoLogistica = Math.round(recargoLogistico * this.splitLogisticaPct);
    return {
      montoLogistica,
      montoMatriz: recargoLogistico - montoLogistica,
    };
  }

  /**
   * `POST {BASE_URL}/transactions/{id}/capture` — API pública de Wompi para
   * capturar una transacción preautorizada (`hold`). *** IGUAL QUE EL RESTO
   * DE ESTA CLASE: NUNCA FUE PROBADO CONTRA SANDBOX REAL *** — mismo
   * criterio y misma advertencia que `iniciarTransaccion` (ver comentario de
   * cabecera de la clase). Es responsabilidad de quien tenga credenciales de
   * sandbox validar este mapeo antes de un despliegue real.
   */
  async capturarHold(wompiTransactionId: string): Promise<{ estado: "capturado" }> {
    const response = await fetch(
      `${WompiGatewayService.BASE_URL}/transactions/${wompiTransactionId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.privateKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Wompi sandbox respondió ${response.status} al capturar el hold "${wompiTransactionId}".`,
      );
    }

    return { estado: "capturado" };
  }
}
