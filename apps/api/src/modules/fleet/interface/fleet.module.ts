import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { RegistrarVehiculoUseCase } from "../application/registrar-vehiculo.use-case";
import { VEHICLE_REPOSITORY } from "../infrastructure/fleet.tokens";
import { PrismaVehicleRepository } from "../infrastructure/prisma/prisma-vehicle.repository";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { FleetController } from "./fleet.controller";

/**
 * FleetModule (Sprint 4, Issue #11 / HU-4.1 — RF-3.1).
 *
 * Wiring de producción por defecto: `PrismaVehicleRepository` (requiere
 * `DATABASE_URL`). Los tests/BDD (apps/api/test/bdd) arman su propio
 * `TestingModule` con `InMemoryVehicleRepository`, mismo criterio que el
 * resto de los módulos de dominio.
 *
 * Exporta `VEHICLE_REPOSITORY`: `LogisticsModule` lo necesita para validar
 * `vehiculo_id` en `POST /logistics/assign-routes` (decisión del Tech Lead,
 * Sprint 4).
 */
@Module({
  imports: [AuthModule],
  controllers: [FleetController],
  providers: [
    PrismaService,
    { provide: VEHICLE_REPOSITORY, useClass: PrismaVehicleRepository },
    RegistrarVehiculoUseCase,
  ],
  exports: [VEHICLE_REPOSITORY, RegistrarVehiculoUseCase],
})
export class FleetModule {}
