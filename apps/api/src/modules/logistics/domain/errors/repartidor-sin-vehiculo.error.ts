/**
 * Se lanza cuando el Repartidor autenticado que pide `GET /logistics/my-route`
 * (HU-8.2) no tiene ningún `Vehicle` con `repartidor_id` apuntando a su
 * `id`. El controller lo mapea a 404 (openapi.yaml declara ese único código
 * para ambos motivos de "no hay ruta que mostrar" — ver también
 * `RutaNoPublicadaHoyError`).
 */
export class RepartidorSinVehiculoError extends Error {
  constructor(repartidorId: string) {
    super(`El repartidor con id "${repartidorId}" no tiene un vehículo asignado.`);
    this.name = "RepartidorSinVehiculoError";
  }
}
