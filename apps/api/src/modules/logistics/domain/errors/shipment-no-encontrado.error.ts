/**
 * Se lanza cuando se referencia un `shipment_id` que no existe en
 * `shipments` (ej. una `parada` de `POST /logistics/assign-routes` que no
 * corresponde a ningún Shipment real — RF-3.1/HU-4.1). El controller lo
 * mapea a 400 (openapi.yaml no declara 404 propio para ese endpoint).
 */
export class ShipmentNoEncontradoError extends Error {
  constructor(shipmentId: string) {
    super(`No existe un envío (shipment) con id "${shipmentId}".`);
    this.name = "ShipmentNoEncontradoError";
  }
}
