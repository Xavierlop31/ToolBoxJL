import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { Roles } from "../../auth/interface/decorators/roles.decorator";
import { RolesGuard } from "../../auth/interface/guards/roles.guard";
import { SupabaseAuthGuard } from "../../auth/interface/guards/supabase-auth.guard";
import { UsuarioActual } from "../../auth/interface/decorators/usuario-actual.decorator";
import { ListarUsuariosUseCase, type ListarUsuariosResultado } from "../application/listar-usuarios.use-case";
import { ActualizarUsuarioUseCase } from "../application/actualizar-usuario.use-case";
import { NoModificarPropioUsuarioError } from "../domain/errors/no-modificar-propio-usuario.error";
import { UsuarioNoEncontradoError } from "../domain/errors/usuario-no-encontrado.error";
import type { UsuarioBasico } from "../domain/user.repository";
import { ListarUsuariosQueryDto } from "./dto/listar-usuarios-query.dto";
import { ActualizarUsuarioDto } from "./dto/actualizar-usuario.dto";

/**
 * `GET /admin/users` + `PATCH /admin/users/{id}` (Épica 16 — Gestión de
 * Usuarios y Roles, pedido directo del Arquitecto 2026-09-11, no viene del
 * PRD original). `x-roles: [admin]` en openapi.yaml para los 2 — a
 * diferencia del resto del panel-admin (analytics/inventory permiten
 * gerente/almacenista además de admin), gestionar roles de OTROS usuarios se
 * restringe a admin únicamente (confirmado con el Arquitecto).
 */
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller("admin/users")
export class AdminUsersController {
  constructor(
    private readonly listarUsuarios: ListarUsuariosUseCase,
    private readonly actualizarUsuario: ActualizarUsuarioUseCase,
  ) {}

  @Roles("admin")
  @Get()
  async listar(@Query() query: ListarUsuariosQueryDto): Promise<ListarUsuariosResultado> {
    return this.listarUsuarios.ejecutar(query);
  }

  @Roles("admin")
  @Patch(":id")
  async actualizar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<UsuarioBasico> {
    if (dto.rol === undefined && dto.activo === undefined) {
      throw new BadRequestException('Se requiere al menos uno de "rol" o "activo".');
    }

    try {
      return await this.actualizarUsuario.ejecutar(id, usuario.id, {
        rol: dto.rol,
        activo: dto.activo,
      });
    } catch (error) {
      if (error instanceof UsuarioNoEncontradoError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof NoModificarPropioUsuarioError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }
}
