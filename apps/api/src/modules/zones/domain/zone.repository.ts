import type { Ciudad, ZonaGeografica } from "./zona-geografica";

/**
 * Puerto de repositorio para zonas logísticas — GET /zones (HU-12.2).
 * Mismo patrón que el resto de repositorios de este backend: el dominio
 * declara la interfaz, `infrastructure/` la implementa dos veces (Prisma
 * para runtime real, in-memory para tests/Cucumber).
 */
export interface ZoneRepository {
  listar(ciudad?: Ciudad): Promise<ZonaGeografica[]>;
}
