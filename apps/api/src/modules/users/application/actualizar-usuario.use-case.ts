import { Inject, Injectable } from "@nestjs/common";
import { USER_REPOSITORY } from "../infrastructure/users.tokens";
import type { CambiosUsuario, UserRepository, UsuarioBasico } from "../domain/user.repository";
import { NoModificarPropioUsuarioError } from "../domain/errors/no-modificar-propio-usuario.error";
import { UsuarioNoEncontradoError } from "../domain/errors/usuario-no-encontrado.error";

/**
 * `PATCH /admin/users/{id}` (Épica 16, `@Roles("admin")` únicamente — ver
 * `AdminUsersController`). `usuarioActualId` es el `sub` del admin
 * autenticado (`@UsuarioActual()`), NUNCA un parámetro del body — se usa
 * solo para el guard de auto-modificación de abajo.
 *
 * El efecto de un cambio de rol/activo en el JWT del usuario afectado es
 * "next login" (custom_access_token_hook, migración
 * `20260911000000_users_admin_management`) — este caso de uso no invalida
 * ninguna sesión existente, decisión confirmada con el Arquitecto.
 */
@Injectable()
export class ActualizarUsuarioUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly usuarios: UserRepository,
  ) {}

  async ejecutar(id: string, usuarioActualId: string, cambios: CambiosUsuario): Promise<UsuarioBasico> {
    if (id === usuarioActualId) {
      throw new NoModificarPropioUsuarioError();
    }

    const actualizado = await this.usuarios.actualizar(id, cambios);
    if (!actualizado) {
      throw new UsuarioNoEncontradoError(id);
    }
    return actualizado;
  }
}
