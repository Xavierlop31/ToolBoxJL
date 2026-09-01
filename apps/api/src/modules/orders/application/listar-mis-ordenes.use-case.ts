import { Inject, Injectable } from "@nestjs/common";
import type { EstadoOrden, Order } from "@toolboxjl/shared-types";
import { ORDER_REPOSITORY } from "../infrastructure/orders.tokens";
import type { OrderRepository } from "../domain/order.repository";

/** Input de `ListarMisOrdenesUseCase.ejecutar` — GET /orders (HU-12.1). */
export interface ListarMisOrdenesInput {
  estado?: EstadoOrden;
  page?: number;
  pageSize?: number;
}

/** Envelope de respuesta — mismo shape que declara openapi.yaml para GET /orders. */
export interface ListarMisOrdenesResultado {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * GET /orders — "Mis Pedidos Activos" (HU-12.1, Fase 3). `clienteId` viene
 * SIEMPRE de `@UsuarioActual()` (JWT), nunca de un query param — regla de
 * seguridad explícita de openapi.yaml, no un detalle de implementación:
 * ningún cliente puede listar pedidos de otro cliente por acá.
 */
@Injectable()
export class ListarMisOrdenesUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
  ) {}

  async ejecutar(
    clienteId: string,
    input: ListarMisOrdenesInput,
  ): Promise<ListarMisOrdenesResultado> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 5;
    const { items, total } = await this.ordenes.listarPorCliente(clienteId, {
      estado: input.estado,
      page,
      pageSize,
    });
    return { items, total, page, pageSize };
  }
}
