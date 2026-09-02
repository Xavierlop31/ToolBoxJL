import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Route } from "@toolboxjl/shared-types";
import type { NuevaRutaInput, RouteRepository } from "../../domain/route.repository";

/**
 * Implementación en memoria de `RouteRepository` — usada SOLO por los tests
 * unitarios y los steps de Cucumber. No usar en runtime de producción.
 */
@Injectable()
export class InMemoryRouteRepository implements RouteRepository {
  private readonly rutas = new Map<string, Route>();

  async crear(input: NuevaRutaInput): Promise<Route> {
    const ruta: Route = {
      id: randomUUID(),
      vehiculo_id: input.vehiculoId,
      fecha: input.fecha,
      paradas: input.paradas,
      generada_por: input.generadaPor,
    };
    this.rutas.set(ruta.id, ruta);
    return ruta;
  }

  async buscarPorVehiculoYFecha(vehiculoId: string, fecha: string): Promise<Route | null> {
    for (const ruta of this.rutas.values()) {
      if (ruta.vehiculo_id === vehiculoId && ruta.fecha === fecha) {
        return ruta;
      }
    }
    return null;
  }

  async listarPorFecha(fecha: string): Promise<Route[]> {
    return [...this.rutas.values()].filter((ruta) => ruta.fecha === fecha);
  }
}
