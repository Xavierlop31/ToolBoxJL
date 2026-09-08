/**
 * Pago asociado a una orden — docs/DESIGN.md §4.1, entidad `PAYMENTS`;
 * contrato de API: openapi.yaml `#/components/schemas/Payment`.
 *
 * Deliberadamente NO existe ningún campo de datos de tarjeta (PAN/CVV/fecha
 * de vencimiento) acá ni en ningún DTO de PaymentsModule — docs/DESIGN.md §8
 * ("no card data stored locally, tokenized by Wompi") es una restricción de
 * seguridad real: el frontend interactúa con el widget/checkout de Wompi,
 * que devuelve un token/fuente de pago; la API solo recibe `metodo`.
 */
export type TipoPago =
  | "pago_alquiler"
  | "pago_venta"
  | "deposito_garantia"
  | "cobro_mora";

export type MetodoPago = "pse" | "tarjeta" | "contra_entrega";

export type EstadoPago =
  | "pendiente"
  | "hold"
  | "capturado"
  | "reembolsado"
  | "fallido";

export interface Payment {
  id: string;
  order_id: string;
  tipo: TipoPago;
  metodo: MetodoPago;
  estado: EstadoPago;
  monto: number;
  wompi_transaction_id: string | null;
}

/** Valores que acepta Wompi para `payment_method.user_legal_id_type` en transacciones PSE. */
export type TipoDocumentoPse = "CC" | "CE" | "NIT" | "TI" | "PP";

/**
 * `POST /orders/{id}/pay` — los 3 campos de PSE son requeridos solo cuando
 * `metodo === "pse"` (Wompi los exige para armar `payment_method`; ver
 * WompiGatewayService). No hay forma de expresar "requerido condicional" en
 * el schema de openapi.yaml, así que quedan opcionales ahí y la validación
 * real vive en `PagarOrdenDto` (`@ValidateIf`).
 */
export interface PagarOrdenInput {
  metodo: MetodoPago;
  user_legal_id_type?: TipoDocumentoPse;
  user_legal_id?: string;
  financial_institution_code?: string;
}

/** `GET /payments/pse-banks` — bancos habilitados para PSE (Wompi). */
export interface PseBank {
  codigo: string;
  nombre: string;
}
