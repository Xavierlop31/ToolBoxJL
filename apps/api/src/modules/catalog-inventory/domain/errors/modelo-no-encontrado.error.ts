/**
 * Se lanza cuando se referencia un `modelo_id` que no existe en
 * `tool_models` (ej. GET /catalog/models/{id}, o POST /inventory/units con
 * un `modelo_id` inválido). El controller mapea este error a 404 o 400 según
 * el endpoint (ver openapi.yaml — algunos no declaran respuesta 404 propia).
 */
export class ModeloNoEncontradoError extends Error {
  constructor(modeloId: string) {
    super(`No existe un modelo de herramienta con id "${modeloId}".`);
    this.name = "ModeloNoEncontradoError";
  }
}
