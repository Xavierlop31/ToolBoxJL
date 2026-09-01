import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Ciudad, ZonaGeografica } from "../../domain/zona-geografica";
import type { ZoneRepository } from "../../domain/zone.repository";

const ZONAS_MEDELLIN = [
  "Poblado",
  "Laureles",
  "Belén",
  "Envigado",
  "Bello",
  "Itagüí",
  "Centro",
] as const;

const ZONAS_BOGOTA = [
  "Chapinero",
  "Usaquén",
  "Suba",
  "Engativá",
  "Fontibón",
  "Calle 80",
  "Zona Industrial",
  "Centro",
] as const;

function crearZonas(nombres: readonly string[], ciudad: Ciudad): ZonaGeografica[] {
  return nombres.map((nombre) => ({ id: randomUUID(), nombre, ciudad }));
}

/**
 * Implementación en memoria de `ZoneRepository` — usada por tests unitarios
 * y steps de Cucumber (mismo criterio que el resto de repos in-memory de
 * este backend). Precarga las mismas 15 zonas de la migración real (7 de
 * Medellín + 8 de Bogotá, ver
 * apps/api/prisma/migrations/20260901000000_zones/migration.sql) para que
 * el comportamiento sea idéntico al de producción.
 */
@Injectable()
export class InMemoryZoneRepository implements ZoneRepository {
  private readonly zonas: ZonaGeografica[] = [
    ...crearZonas(ZONAS_MEDELLIN, "Medellín"),
    ...crearZonas(ZONAS_BOGOTA, "Bogotá"),
  ];

  async listar(ciudad?: Ciudad): Promise<ZonaGeografica[]> {
    return ciudad ? this.zonas.filter((z) => z.ciudad === ciudad) : this.zonas;
  }
}
