/**
 * `PATCH`/`DELETE /cart/items/{id}` (HU-12.3, Fase 3, Issue #146). Se lanza
 * tanto si la línea no existe en absoluto como si existe pero pertenece al
 * carrito de OTRO cliente — mismo criterio anti-enumeración que
 * `OrdenNoEncontradaError`/`PagarOrdenUseCase`: como los casos de uso de
 * CartModule siempre resuelven la línea dentro del carrito propio del
 * cliente autenticado (`CartRepository.obtenerOCrearPorClienteId(clienteId)`),
 * esta clase nunca necesita distinguir los dos casos explícitamente.
 */
export class LineaCarritoNoEncontradaError extends Error {
  constructor(id: string) {
    super(`No existe una línea de carrito con id "${id}" en el carrito del cliente autenticado.`);
    this.name = "LineaCarritoNoEncontradaError";
  }
}
