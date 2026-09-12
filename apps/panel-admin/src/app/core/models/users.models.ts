/**
 * Épica 16 (Gestión de Usuarios y Roles, pedido directo del Arquitecto
 * 2026-09-11, no viene del PRD original) — `GET/PATCH /admin/users*`
 * (openapi.yaml, schema `User`). Solo rol admin.
 */
export const ROLES_HUMANOS = ['admin', 'gerente', 'almacenista', 'repartidor', 'cliente'] as const;
export type Rol = (typeof ROLES_HUMANOS)[number];

export interface AdminUser {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: Rol;
  /**
   * `false` = no puede volver a iniciar sesión desde este momento — aplica
   * en su próximo login/refresh de token (custom_access_token_hook), no
   * corta una sesión ya activa.
   */
  activo: boolean;
}

export interface ListUsersParams {
  q?: string;
  rol?: Rol;
  activo?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListUsersResult {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

/** `PATCH /admin/users/{id}` — al menos uno de los dos, ambos opcionales. */
export interface UpdateUserInput {
  rol?: Rol;
  activo?: boolean;
}
