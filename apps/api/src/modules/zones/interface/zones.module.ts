import { Module } from "@nestjs/common";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { ListarZonasUseCase } from "../application/listar-zonas.use-case";
import { ZONE_REPOSITORY } from "../infrastructure/zones.tokens";
import { PrismaZoneRepository } from "../infrastructure/prisma/prisma-zone.repository";
import { ZonesController } from "./zones.controller";

/**
 * Módulo nuevo, Sprint 12 (HU-12.2, Fase 3). Estructura de capas idéntica a
 * CatalogInventoryModule pero mucho más chica: una sola entidad
 * (`ZonaGeografica`), un solo repositorio, un solo caso de uso, un
 * controller público (`@Public()`, sin `@UseGuards` propio — el guard de
 * autenticación es global, ver AuthModule). No importa AuthModule acá:
 * `@Public()` es solo metadata leída por ese guard global, no requiere
 * ningún provider de este módulo.
 *
 * Wiring de producción por defecto: la implementación Prisma real (requiere
 * `DATABASE_URL`). Los tests unitarios y los steps de Cucumber usan
 * `InMemoryZoneRepository` directamente, sin pasar por este módulo — mismo
 * criterio que CatalogInventoryModule.
 */
@Module({
  controllers: [ZonesController],
  providers: [
    PrismaService,
    { provide: ZONE_REPOSITORY, useClass: PrismaZoneRepository },
    ListarZonasUseCase,
  ],
  exports: [ZONE_REPOSITORY, ListarZonasUseCase],
})
export class ZonesModule {}
