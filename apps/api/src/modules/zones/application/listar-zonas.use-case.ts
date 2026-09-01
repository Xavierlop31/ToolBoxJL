import { Inject, Injectable } from "@nestjs/common";
import { ZONE_REPOSITORY } from "../infrastructure/zones.tokens";
import type { Ciudad, ZonaGeografica } from "../domain/zona-geografica";
import type { ZoneRepository } from "../domain/zone.repository";

/** GET /zones (público) — HU-12.2, Fase 3. */
@Injectable()
export class ListarZonasUseCase {
  constructor(
    @Inject(ZONE_REPOSITORY)
    private readonly zonas: ZoneRepository,
  ) {}

  async ejecutar(ciudad?: Ciudad): Promise<ZonaGeografica[]> {
    return this.zonas.listar(ciudad);
  }
}
