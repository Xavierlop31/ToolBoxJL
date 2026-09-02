import { Module } from "@nestjs/common";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { USER_REPOSITORY } from "../infrastructure/users.tokens";
import { PrismaUserRepository } from "../infrastructure/prisma/prisma-user.repository";

/**
 * UsersModule (Sprint 14, HU-13.4) — puerto de SOLO LECTURA sobre
 * `public.users`, para que `LogisticsModule` (`GET /logistics/routes-today`)
 * pueda resolver nombre de repartidor/cliente sin duplicar la lógica de
 * mapeo Prisma↔dominio en cada módulo que la necesite. Ver
 * `domain/user.repository.ts` para el detalle de por qué este módulo existe
 * recién ahora.
 *
 * Wiring de producción por defecto: `PrismaUserRepository` (requiere
 * `DATABASE_URL`). Los tests/BDD arman su propio `TestingModule` con
 * `InMemoryUserRepository`, mismo criterio que el resto de los módulos.
 */
@Module({
  providers: [
    PrismaService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
