import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import { ORDER_REPOSITORY } from "../infrastructure/orders.tokens";
import type { OrderRepository } from "../domain/order.repository";
import { OrdenNoEncontradaError } from "../domain/errors/orden-no-encontrada.error";
import type { Order, UsuarioAutenticado } from "@toolboxjl/shared-types";

@Injectable()
export class ObtenerOrdenUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly ordenes: OrderRepository,
  ) {}

  async ejecutar(id: string, usuario: UsuarioAutenticado): Promise<Order> {
    const orden = await this.ordenes.buscarPorId(id);
    if (!orden) {
      throw new OrdenNoEncontradaError(id);
    }

    // Validar acceso: el cliente solo puede ver sus propias órdenes. El staff puede ver todas.
    const esStaff = ["admin", "gerente", "almacenista", "repartidor"].includes(usuario.rol);
    if (!esStaff && orden.cliente_id !== usuario.id) {
      throw new ForbiddenException("No tienes permiso para acceder a esta orden.");
    }

    return orden;
  }
}
