import { Injectable } from "@nestjs/common";
import type { CartItem as PrismaCartItem } from "@prisma/client";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";
import type { CartAggregate, CartLineItem, CartRepository } from "../../domain/cart.repository";

function aLineaDominio(item: PrismaCartItem): CartLineItem {
  return {
    id: item.id,
    modelo_id: item.modeloId,
    cantidad: item.cantidad,
    dias: item.dias ?? null,
  };
}

/**
 * Implementación real (Prisma → Supabase Postgres) de `CartRepository`.
 * Requiere `DATABASE_URL` (ver `PrismaService`) — no se usa en tests/BDD.
 *
 * *** NUNCA FUE EJECUTADA CONTRA UNA BASE REAL *** — mismo criterio y misma
 * advertencia que el resto de los repositorios Prisma de este repo (ver
 * cabecera de apps/api/prisma/schema.prisma).
 */
@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerOCrearPorClienteId(clienteId: string): Promise<CartAggregate> {
    const carrito = await this.prisma.cart.upsert({
      where: { clienteId },
      create: { clienteId },
      update: {},
      include: { items: true },
    });
    return { clienteId, items: carrito.items.map(aLineaDominio) };
  }

  async guardarItems(clienteId: string, items: CartLineItem[]): Promise<CartAggregate> {
    const carrito = await this.prisma.cart.upsert({
      where: { clienteId },
      create: { clienteId },
      update: {},
    });

    // Reemplazo "wholesale" de la lista de líneas dentro de una transacción
    // (delete + createMany) — la lógica de qué líneas quedan finales (sumar
    // cantidad de un modelo ya existente, etc.) ya la resolvió el use case
    // que llama acá (AgregarItemCarritoUseCase); este repositorio solo
    // persiste el resultado, mismo criterio documentado en
    // domain/cart.repository.ts. `id` se pasa explícito en `createMany`
    // (Sprint 13, HU-12.3) — así el `id` de cada línea sobrevive al
    // reemplazo "wholesale" en vez de que Prisma genere uno nuevo cada vez
    // (`@default(uuid())` del schema solo aplica cuando `id` no viene en
    // `data`).
    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { cartId: carrito.id } }),
      ...(items.length > 0
        ? [
            this.prisma.cartItem.createMany({
              data: items.map((item) => ({
                id: item.id,
                cartId: carrito.id,
                modeloId: item.modelo_id,
                cantidad: item.cantidad,
                dias: item.dias ?? null,
              })),
            }),
          ]
        : []),
    ]);

    return { clienteId, items: items.map((item) => ({ ...item })) };
  }
}
