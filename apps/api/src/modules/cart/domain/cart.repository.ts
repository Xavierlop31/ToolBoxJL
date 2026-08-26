/**
 * Línea de carrito en el modelo de dominio (a diferencia de `CartItem` de
 * `@toolboxjl/shared-types`, que es el DTO de API): `dias` es
 * `number | null` acá (no `undefined`) porque así se persiste/lee de forma
 * uniforme en ambas implementaciones (Prisma — columna nullable — e
 * in-memory).
 */
export interface CartLineItem {
  modelo_id: string;
  cantidad: number;
  dias: number | null;
}

export interface CartAggregate {
  clienteId: string;
  items: CartLineItem[];
}

/**
 * Puerto de repositorio del carrito — Clean Architecture, mismo criterio que
 * `ToolModelRepository`/`OrderRepository`: el dominio declara la interfaz,
 * `infrastructure/` la implementa dos veces (Prisma para runtime real,
 * in-memory para tests/BDD).
 *
 * Diseño (decisión documentada del Backend Developer, Sprint 9): un carrito
 * por cliente (1:1 con `usuario.id` del JWT) — no se soportan múltiples
 * carritos por cliente, no hay endpoint de "vaciar carrito" ni de checkout
 * en este sprint (fuera de alcance, no está en los escenarios Gherkin de
 * `features/10_agente_conserje_voz.feature`).
 *
 * La lógica de "sumar cantidad si el modelo ya está en el carrito" (RF de
 * `POST /cart/add-item`) vive en `AgregarItemCarritoUseCase`, NO acá — así
 * no se duplica esa regla de negocio entre `PrismaCartRepository` e
 * `InMemoryCartRepository`. `guardarItems` reemplaza la lista completa de
 * líneas (upsert "wholesale"), calculada ya por el caso de uso.
 */
export interface CartRepository {
  /** Devuelve el carrito del cliente, creando uno vacío (persistido) si todavía no existe. */
  obtenerOCrearPorClienteId(clienteId: string): Promise<CartAggregate>;
  /** Reemplaza la lista completa de líneas del carrito del cliente. */
  guardarItems(clienteId: string, items: CartLineItem[]): Promise<CartAggregate>;
}
