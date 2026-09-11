import { Module } from "@nestjs/common";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { USER_REPOSITORY } from "../infrastructure/users.tokens";
import { PrismaUserRepository } from "../infrastructure/prisma/prisma-user.repository";
import { ListarUsuariosUseCase } from "../application/listar-usuarios.use-case";
import { ActualizarUsuarioUseCase } from "../application/actualizar-usuario.use-case";
import { AdminUsersController } from "./users.controller";

/**
 * UsersModule (Sprint 14, HU-13.4 — puerto de lectura sobre `public.users`
 * para que `LogisticsModule` resuelva nombres; Épica 16 — Gestión de
 * Usuarios y Roles, agrega `AdminUsersController`, `@Roles("admin")`
 * únicamente, para `GET/PATCH /admin/users*`).
 *
 * Wiring de producción por defecto: `PrismaUserRepository` (requiere
 * `DATABASE_URL`). Los tests/BDD arman su propio `TestingModule` con
 * `InMemoryUserRepository`, mismo criterio que el resto de los módulos.
 */
@Module({
  controllers: [AdminUsersController],
  providers: [
    PrismaService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    ListarUsuariosUseCase,
    ActualizarUsuarioUseCase,
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
