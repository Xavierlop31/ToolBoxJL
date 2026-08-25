import type { EstadoPago, MetodoPago, Payment, TipoPago } from "@toolboxjl/shared-types";

export interface NuevoPagoInput {
  orderId: string;
  tipo: TipoPago;
  metodo: MetodoPago;
  estado: EstadoPago;
  monto: number;
  wompiTransactionId: string | null;
}

/**
 * Puerto de repositorio para `Payment` — mismo patrón dual (Prisma real /
 * in-memory para BDD) que `OrderRepository`/`ToolModelRepository`.
 */
export interface PaymentRepository {
  crear(input: NuevoPagoInput): Promise<Payment>;
  buscarPorId(id: string): Promise<Payment | null>;
  listarPorOrden(orderId: string): Promise<Payment[]>;
  actualizarEstado(id: string, estado: EstadoPago): Promise<Payment>;
}
