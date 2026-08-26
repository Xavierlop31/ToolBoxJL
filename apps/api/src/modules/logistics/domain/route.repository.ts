import type { GeneradaPor, Route } from "@toolboxjl/shared-types";

export interface NuevaRutaInput {
  vehiculoId: string;
  fecha: string;
  paradas: string[];
  generadaPor: GeneradaPor;
}

/** Puerto de repositorio para `Route` — mismo criterio que `ShipmentRepository`. */
export interface RouteRepository {
  crear(input: NuevaRutaInput): Promise<Route>;
  /**
   * `GET /logistics/my-route` (HU-8.2, Sprint 7) — la `Route` publicada para
   * un vehículo en una fecha dada (formato `YYYY-MM-DD`), o `null` si el
   * Agente 1 (o quien haya publicado rutas manualmente) todavía no publicó
   * ninguna para ese vehículo/día.
   */
  buscarPorVehiculoYFecha(vehiculoId: string, fecha: string): Promise<Route | null>;
}
