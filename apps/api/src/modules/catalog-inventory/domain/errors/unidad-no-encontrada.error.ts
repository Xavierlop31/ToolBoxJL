/**
 * Se lanza cuando se referencia un `unidad_id` que no existe en
 * `tool_units` (GET /inventory/units/{id}, PATCH /inventory/units/{id}/status).
 * Ambos endpoints declaran 404 en openapi.yaml — el controller mapea este
 * error a `NotFoundException`.
 */
export class UnidadNoEncontradaError extends Error {
  constructor(unidadId: string) {
    super(`No existe una unidad física con id "${unidadId}".`);
    this.name = "UnidadNoEncontradaError";
  }
}
