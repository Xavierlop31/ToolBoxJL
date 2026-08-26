/**
 * Formas JSON de la API REST de `apps/api` que este job consume (contrato:
 * `openapi.yaml` — `Shipment`, `Vehicle`, `RouteInput`, `Route`). NO se
 * importan desde `packages/shared-types` a propósito: `apps/workers` es un
 * deployable independiente (Railway) que solo depende de HTTP contra
 * `apps/api`, nunca de código compartido con otra app (mismo criterio
 * documentado en `route-scheduler.ts` para `calcularMora`/`mora-calculator.ts`
 * — CLAUDE.md §3, cada app del monorepo depende solo de `packages/`).
 */

export interface ShipmentApi {
  id: string;
  order_id: string;
  vehiculo_id: string | null;
  tipo: "entrega" | "recogida";
  estado_envio: string;
  /**
   * Campos NO garantizados por el contrato actual de `Shipment`
   * (`openapi.yaml`) — opcionales a propósito, para que el mapeo hacia
   * `PedidoPendiente` (route-scheduler.ts) no explote si el endpoint real
   * todavía no los expone. Ver el GAP DE CONTRATO documentado en
   * `route-scheduler.ts`.
   */
  zona_id?: string | null;
  peso_kg?: number | null;
  volumen_m3?: number | null;
}

export interface VehicleApi {
  id: string;
  tipo: string;
  capacidad_kg: number;
  capacidad_m3: number;
  zonas: string[];
  repartidor_id: string | null;
}

export interface RouteInputApi {
  vehiculo_id: string;
  fecha: string;
  paradas: string[];
}

export interface RouteApi extends RouteInputApi {
  id: string;
  generada_por?: string;
}
