import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { PseBank, WompiTerms } from "@toolboxjl/shared-types";
import type {
  IniciarTransaccionInput,
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
  private static readonly BANCOS_FAKE: PseBank[] = [
    { codigo: "1", nombre: "Banco de Prueba 1" },
    { codigo: "2", nombre: "Banco de Prueba 2" },
  ];

  async iniciarTransaccion(input: IniciarTransaccionInput): Promise<ResultadoTransaccionWompi> {
    if (input.monto <= 0) {
      throw new Error("Wompi (simulado): no se puede iniciar una transacción con monto <= 0.");
    }
    return {
      wompiTransactionId: `wompi-fake-${randomUUID()}`,
      estado: input.modo === "hold" ? "hold" : "capturado",
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

  async listarBancosPse(): Promise<PseBank[]> {
    return InMemoryWompiGateway.BANCOS_FAKE;
  }

  async obtenerTerminos(): Promise<WompiTerms> {
    return {
      acceptance_token: "token-aceptacion-fake",
      accept_personal_auth: "token-autorizacion-datos-fake",
      reglamento_url: "https://ejemplo.com/reglamento-fake.pdf",
      politica_datos_url: "https://ejemplo.com/politica-datos-fake.pdf",
    };
  }
}
