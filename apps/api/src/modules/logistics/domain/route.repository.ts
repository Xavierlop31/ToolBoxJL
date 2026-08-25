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
}
