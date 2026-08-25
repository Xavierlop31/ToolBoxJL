/**
 * Se lanza cuando se referencia un `vehiculo_id` que no existe en
 * `vehicles` (ej. `POST /logistics/assign-routes` con un `vehiculo_id`
 * inválido — RF-3.1/HU-4.1). El controller que la invoca la mapea a 400
 * (openapi.yaml no declara 404 propio para ese endpoint).
 */
export class VehiculoNoEncontradoError extends Error {
  constructor(vehiculoId: string) {
    super(`No existe un vehículo con id "${vehiculoId}".`);
    this.name = "VehiculoNoEncontradoError";
  }
}
