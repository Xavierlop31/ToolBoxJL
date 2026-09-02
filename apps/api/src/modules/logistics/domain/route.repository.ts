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
  /**
   * `GET /logistics/routes-today` (HU-13.4, Sprint 14) — TODAS las `Route`
   * publicadas para una fecha dada (formato `YYYY-MM-DD`), sin filtrar por
   * vehículo — a diferencia de `buscarPorVehiculoYFecha` (HU-8.2, que ya
   * conoce el vehículo del Repartidor autenticado).
   */
  listarPorFecha(fecha: string): Promise<Route[]>;
}
