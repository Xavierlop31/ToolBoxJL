import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Rol, UsuarioAutenticado } from "@toolboxjl/shared-types";
import { AccesoDenegadoError } from "../../domain/errors/acceso-denegado.error";
import { PoliticaAccesoService } from "../../domain/politica-acceso.service";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Guard de RBAC reutilizable: lee los roles declarados con `@Roles(...)` en
 * el handler/controller y los evalúa contra `request.user.rol` usando la
 * regla de dominio `PoliticaAccesoService`.
 *
 * Debe correr siempre después de `SupabaseAuthGuard` (que puebla
 * `request.user`) — en un controller real, orden de guards:
 * `@UseGuards(SupabaseAuthGuard, RolesGuard)`.
 *
 * Sin `@Roles(...)` en el recurso, solo exige que haya un usuario
 * autenticado (cualquier rol) — mismo criterio que `PoliticaAccesoService`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly politica = new PoliticaAccesoService();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos =
      this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const request = context.switchToHttp().getRequest();
    const usuario: UsuarioAutenticado | undefined = request.user;

    if (!usuario) {
      throw new UnauthorizedException(
        "No hay usuario autenticado en la solicitud.",
      );
    }

    try {
      this.politica.verificarAcceso(usuario.rol, rolesPermitidos);
    } catch (error) {
      if (error instanceof AccesoDenegadoError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }

    return true;
  }
}
