/**
 * Se lanza cuando `GET /logistics/my-route` (HU-8.2) resuelve el vehículo
 * del Repartidor autenticado pero no existe ninguna `Route` publicada para
 * ese `vehiculo_id` en la fecha de hoy (el Agente 1 todavía no corrió el
 * batch nocturno, o corrió pero no le tocó ruta a este vehículo). El
 * controller lo mapea a 404 (mismo código que `RepartidorSinVehiculoError`
 * — openapi.yaml declara un único 404 para "no hay ruta que mostrar").
 */
export class RutaNoPublicadaHoyError extends Error {
  constructor(vehiculoId: string, fecha: string) {
    super(`No hay ninguna ruta publicada para el vehículo "${vehiculoId}" en la fecha "${fecha}".`);
    this.name = "RutaNoPublicadaHoyError";
  }
}
