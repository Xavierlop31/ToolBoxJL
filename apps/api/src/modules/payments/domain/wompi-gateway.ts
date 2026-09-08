import type { MetodoPago, PseBank, TipoDocumentoPse } from "@toolboxjl/shared-types";

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

/**
 * Datos que Wompi exige dentro de `payment_method` para una transacción PSE
 * (`type: "PSE"`, ver Wompi docs públicos de `POST /transactions`) — sin
 * esto, Wompi rechaza con 422 "No se especificó método de pago o fuente de
 * pago" (encontrado en producción, ver PR de este mismo cambio).
 */
export interface DatosPseWompi {
  userLegalIdType: TipoDocumentoPse;
  userLegalId: string;
  financialInstitutionCode: string;
}

export interface IniciarTransaccionInput {
  monto: number;
  metodo: MetodoPagoWompi;
  modo: ModoTransaccionWompi;
  /**
   * Única por INTENTO, no solo por orden — un reintento tras un fallo no
   * debe reusar la referencia del intento anterior (Wompi la exige y
   * podría rechazar una repetida). Ver PagarOrdenUseCase.
   */
  referencia: string;
  /** Wompi lo exige en toda transacción, sin importar el método. */
  customerEmail: string;
  /** Requerido si `metodo === "pse"`; ignorado para "tarjeta". */
  datosPse?: DatosPseWompi;
}

export interface ResultadoTransaccionWompi {
  wompiTransactionId: string;
  /**
   * "pendiente" — PSE real es asíncrono: Wompi devuelve `PENDING` en la
   * creación (el pagador todavía tiene que autenticarse en su banco) y la
   * confirmación final llega después, por webhook — *** NO IMPLEMENTADO
   * ACÁ ***, gap documentado igual que el resto de esta clase (nunca
   * probada end-to-end contra Wompi real). "capturado"/"hold" siguen
   * siendo síncronos para tarjeta (aunque tarjeta tampoco está resuelta —
   * falta la tokenización del lado del cliente, ver Wompi.js).
   */
  estado: "capturado" | "hold" | "pendiente";
}

export interface ResultadoSplitWompi {
  montoLogistica: number;
  montoMatriz: number;
}

export interface WompiGateway {
  iniciarTransaccion(input: IniciarTransaccionInput): Promise<ResultadoTransaccionWompi>;

  /**
   * Simula el split de pago entre la cuenta matriz y la del proveedor
   * logístico (RF-2.4, HU-3.3) — no hay spec de cuentas/porcentajes reales
   * de Wompi todavía, así que el % se toma de una constante configurable
   * (ver infrastructure/config/wompi.config.ts).
   */
  simularSplit(recargoLogistico: number): ResultadoSplitWompi;

  /**
   * Captura (cobra en definitiva) una transacción que se inició como `hold`
   * (preautorización con tarjeta) — Sprint 5, HU-5.1/RF-4.2: se invoca desde
   * `InspectionModule/RegistrarInspeccionUseCase` cuando un checklist de
   * recepción con hallazgo `moderada`/`grave` ejecuta la garantía sobre un
   * depósito preautorizado. `iniciarTransaccion` no sirve para esto: ese
   * método siempre abre una transacción NUEVA, y acá se necesita capturar
   * una transacción YA EXISTENTE (identificada por su
   * `wompi_transaction_id`).
   */
  capturarHold(wompiTransactionId: string): Promise<{ estado: "capturado" }>;

  /** `GET /payments/pse-banks` — bancos habilitados para PSE. */
  listarBancosPse(): Promise<PseBank[]>;
}
