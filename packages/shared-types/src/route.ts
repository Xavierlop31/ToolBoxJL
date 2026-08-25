/**
 * Ruta diaria de reparto/recogida — docs/DESIGN.md §4.1, entidad `ROUTES`;
 * contrato de API: openapi.yaml `#/components/schemas/Route` (Sprint 4,
 * HU-4.1). `paradas` es un array de `shipment_id` en orden de secuencia
 * (modelado como `jsonb` en Postgres, no como relación normalizada — ver
 * docs/DESIGN.md §4.1).
 *
 * `generada_por` siempre vale `"manual"` hasta Sprint 7 (Agente 1 — Route
 * Scheduler — todavía no existe).
 */
export type GeneradaPor = "agente_1" | "manual";

export interface Route {
  id: string;
  vehiculo_id: string;
  fecha: string;
  paradas: string[];
  generada_por: GeneradaPor;
}

/** Payload de `POST /logistics/assign-routes` (uno por vehículo/día). */
export interface RouteInput {
  vehiculo_id: string;
  fecha: string;
  paradas: string[];
}
