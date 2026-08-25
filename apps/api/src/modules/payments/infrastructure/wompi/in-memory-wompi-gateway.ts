import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  MetodoPagoWompi,
  ModoTransaccionWompi,
  ResultadoSplitWompi,
  ResultadoTransaccionWompi,
  WompiGateway,
} from "../../domain/wompi-gateway";

/**
 * Fake determinístico para tests/BDD — nunca llama a la red. Simula éxito
 * siempre que el monto sea > 0 (monto <= 0 se trata como fallo, criterio
 * del Tech Lead para este sprint).
 */
@Injectable()
export class InMemoryWompiGateway implements WompiGateway {
  private static readonly SPLIT_LOGISTICA_PCT_DEFAULT = 0.15;

  async iniciarTransaccion(
    monto: number,
    _metodo: MetodoPagoWompi,
    modo: ModoTransaccionWompi,
  ): Promise<ResultadoTransaccionWompi> {
    if (monto <= 0) {
      throw new Error("Wompi (simulado): no se puede iniciar una transacción con monto <= 0.");
    }
    return {
      wompiTransactionId: `wompi-fake-${randomUUID()}`,
      estado: modo === "hold" ? "hold" : "capturado",
    };
  }

  simularSplit(recargoLogistico: number): ResultadoSplitWompi {
    const montoLogistica = Math.round(
      recargoLogistico * InMemoryWompiGateway.SPLIT_LOGISTICA_PCT_DEFAULT,
    );
    return {
      montoLogistica,
      montoMatriz: recargoLogistico - montoLogistica,
    };
  }

  /** Fake determinístico — siempre "captura" con éxito, nunca llama a la red. */
  async capturarHold(_wompiTransactionId: string): Promise<{ estado: "capturado" }> {
    return { estado: "capturado" };
  }
}
