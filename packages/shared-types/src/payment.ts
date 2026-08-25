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
