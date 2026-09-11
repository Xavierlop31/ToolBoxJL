import { Inject, Injectable } from "@nestjs/common";
import type { RolHumano } from "@toolboxjl/shared-types";
import { USER_REPOSITORY } from "../infrastructure/users.tokens";
import type { UserRepository, UsuarioBasico } from "../domain/user.repository";

/** Input de `ListarUsuariosUseCase.ejecutar` — GET /admin/users (Épica 16). */
export interface ListarUsuariosInput {
  q?: string;
  rol?: RolHumano;
  activo?: boolean;
  page?: number;
  pageSize?: number;
}

/** Envelope de respuesta — mismo shape que declara openapi.yaml para GET /admin/users. */
export interface ListarUsuariosResultado {
  items: UsuarioBasico[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * `GET /admin/users` (Épica 16, `@Roles("admin")` únicamente — ver
 * `AdminUsersController`). Mismo patrón de paginación que
 * `ListarMisOrdenesUseCase` (orders).
 */
@Injectable()
export class ListarUsuariosUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly usuarios: UserRepository,
  ) {}

  async ejecutar(input: ListarUsuariosInput): Promise<ListarUsuariosResultado> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const { items, total } = await this.usuarios.listar({
      q: input.q,
      rol: input.rol,
      activo: input.activo,
      page,
      pageSize,
    });
    return { items, total, page, pageSize };
  }
}
