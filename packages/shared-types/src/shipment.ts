/**
 * Envío asociado a una orden — docs/DESIGN.md §4.1, entidad `SHIPMENTS`
 * (relación `ORDERS ||--|| SHIPMENTS`, 1:1); contrato de API: openapi.yaml
 * `#/components/schemas/Shipment` (Sprint 4, HU-4.1/4.2/4.3).
 *
 * Un Shipment de tipo `entrega` se crea automáticamente cuando una Orden
 * queda `confirmada` (ver PaymentsModule/PagarOrdenUseCase). El tipo
 * `recogida` (ciclo de devolución) es responsabilidad de InspectionModule,
 * Sprint 5 — fuera de alcance de este sprint.
 */
export type TipoEnvio = "entrega" | "recogida";

export type EstadoEnvio =
  | "pendiente_asignacion"
  | "en_ruta_entrega"
  | "entregado"
  | "en_ruta_recogida"
  | "retornado";

export interface Shipment {
  id: string;
  order_id: string;
  vehiculo_id: string | null;
  tipo: TipoEnvio;
  estado_envio: EstadoEnvio;
}
