import { Injectable } from "@nestjs/common";
import type { PseBank } from "@toolboxjl/shared-types";
import type {
  IniciarTransaccionInput,
  ModoTransaccionWompi,
  ResultadoSplitWompi,
  ResultadoTransaccionWompi,
  WompiGateway,
} from "../../domain/wompi-gateway";
import { loadSplitLogisticaPct, loadWompiCredentials } from "../config/wompi.config";

/**
 * Implementación real contra Wompi sandbox (https://sandbox.wompi.co/v1).
 *
 * *** NUNCA FUE PROBADA END-TO-END CONTRA LA API REAL DE WOMPI *** — ver
 * historial de esta clase: dos rechazos reales de producción ya corregidos
 * acá (401 por credencial de producción vs. sandbox — env var, no código;
 * 422 por `reference` faltante). El mapeo de `payment_method` para PSE
 * sigue la documentación pública de Wompi para `POST /transactions` pero
 * TAMPOCO fue confirmado end-to-end — puede necesitar otra vuelta si Wompi
 * rechaza algún campo más. Tarjeta (`CARD`) queda deliberadamente sin
 * resolver: Wompi exige un `token` generado del lado del cliente con
 * Wompi.js (tokenización real de la tarjeta), que no existe en este
 * frontend — seleccionar "Tarjeta" sigue fallando hasta que se construya
 * esa integración aparte.
 *
 * *** PSE es asíncrono en Wompi real, esto NO lo maneja *** — Wompi
 * devuelve `status: "PENDING"` en la creación (mapeado acá a
 * `estado: "pendiente"`) y la confirmación final (aprobado/declinado)
 * llega después por webhook, tras que el pagador se autentique en su
 * banco. No hay webhook de Wompi implementado en este repo — la orden
 * queda pagada informalmente en `estado: "pendiente"` sin actualizarse
 * sola cuando el banco confirma. Gap documentado, no un bug de este PR.
 */
@Injectable()
export class WompiGatewayService implements WompiGateway {
  private static readonly BASE_URL = "https://sandbox.wompi.co/v1";

  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly splitLogisticaPct: number;

  constructor() {
    const credenciales = loadWompiCredentials();
    this.privateKey = credenciales.privateKey;
    this.publicKey = credenciales.publicKey;
    this.splitLogisticaPct = loadSplitLogisticaPct();
  }

  async iniciarTransaccion(input: IniciarTransaccionInput): Promise<ResultadoTransaccionWompi> {
    const paymentMethod =
      input.metodo === "pse"
        ? {
            type: "PSE",
            // 0 = persona natural (Wompi) — este flujo no soporta persona jurídica.
            user_type: 0,
            user_legal_id_type: input.datosPse?.userLegalIdType,
            user_legal_id: input.datosPse?.userLegalId,
            financial_institution_code: input.datosPse?.financialInstitutionCode,
            payment_description: `Pago ToolBox JL — orden ${input.referencia}`,
          }
        : { type: "CARD" }; // *** sin token — ver comentario de cabecera de la clase ***

    const response = await fetch(`${WompiGatewayService.BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.privateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount_in_cents: input.monto * 100,
        currency: "COP",
        customer_email: input.customerEmail,
        reference: input.referencia,
        payment_method: paymentMethod,
        capture_method: input.modo === "hold" ? "manual" : "automatic",
      }),
    });

    if (!response.ok) {
      let detalle = "(no se pudo leer el cuerpo de la respuesta)";
      try {
        detalle = await response.text();
      } catch {
        // se queda con el fallback de arriba — no tapar el error original por uno de logging.
      }
      throw new Error(
        `Wompi sandbox respondió ${response.status} al iniciar la transacción (metodo: ${input.metodo}, modo: ${input.modo}). Detalle: ${detalle}`,
      );
    }

    const body = (await response.json()) as { data?: { id?: string; status?: string } };
    const wompiTransactionId = body.data?.id;
    if (!wompiTransactionId) {
      throw new Error("Wompi sandbox no devolvió un id de transacción.");
    }

    return {
      wompiTransactionId,
      estado: this.mapearEstado(body.data?.status, input.modo),
    };
  }

  private mapearEstado(
    status: string | undefined,
    modo: ModoTransaccionWompi,
  ): ResultadoTransaccionWompi["estado"] {
    if (status === "PENDING") {
      return "pendiente";
    }
    return modo === "hold" ? "hold" : "capturado";
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

  /**
   * `GET /pse/financial_institutions` — lista pública de Wompi (no exige la
   * private key), pero SÍ exige la public key como Bearer, no como query
   * param (a diferencia de lo que el nombre del query param sugeriría) — ver
   * https://docs.wompi.co/en/docs/colombia/metodos-de-pago/. Mandarla como
   * `?public_key=` (como se hacía antes) produce 401 aunque la key sea
   * correcta.
   */
  async listarBancosPse(): Promise<PseBank[]> {
    const response = await fetch(`${WompiGatewayService.BASE_URL}/pse/financial_institutions`, {
      headers: { Authorization: `Bearer ${this.publicKey}` },
    });

    if (!response.ok) {
      let detalle = "(no se pudo leer el cuerpo de la respuesta)";
      try {
        detalle = await response.text();
      } catch {
        // se queda con el fallback de arriba — no tapar el error original por uno de logging.
      }
      throw new Error(
        `Wompi sandbox respondió ${response.status} al listar bancos PSE. Detalle: ${detalle}`,
      );
    }

    const body = (await response.json()) as {
      data?: { financial_institution_code: string; financial_institution_name: string }[];
    };

    return (body.data ?? []).map((banco) => ({
      codigo: banco.financial_institution_code,
      nombre: banco.financial_institution_name,
    }));
  }
}
