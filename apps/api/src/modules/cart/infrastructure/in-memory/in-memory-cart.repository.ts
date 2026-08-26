import { Injectable } from "@nestjs/common";
import type { CartAggregate, CartLineItem, CartRepository } from "../../domain/cart.repository";

/**
 * Implementación en memoria de `CartRepository` — usada SOLO por los tests
 * unitarios y los steps de Cucumber (mismo criterio que
 * `InMemoryToolModelRepository`/`InMemoryOrderRepository`): no requiere
 * `DATABASE_URL` ni una base real. No usar en runtime de producción.
 */
@Injectable()
export class InMemoryCartRepository implements CartRepository {
  private readonly carritos = new Map<string, CartLineItem[]>();

  async obtenerOCrearPorClienteId(clienteId: string): Promise<CartAggregate> {
    if (!this.carritos.has(clienteId)) {
      this.carritos.set(clienteId, []);
    }
    return this.aAggregate(clienteId);
  }

  async guardarItems(clienteId: string, items: CartLineItem[]): Promise<CartAggregate> {
    this.carritos.set(
      clienteId,
      items.map((item) => ({ ...item })),
    );
    return this.aAggregate(clienteId);
  }

  private aAggregate(clienteId: string): CartAggregate {
    const items = this.carritos.get(clienteId) ?? [];
    return { clienteId, items: items.map((item) => ({ ...item })) };
  }
}
