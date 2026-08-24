import { SetMetadata } from "@nestjs/common";
import type { Rol } from "@toolboxjl/shared-types";

export const ROLES_KEY = "roles";

/**
 * Declara los roles permitidos para un handler/controller, ej.:
 *
 *   @Roles("almacenista", "admin")
 *   @Patch("inventory/units/:id/status")
 *   actualizarEstado() { ... }
 *
 * `RolesGuard` lee este metadata con `Reflector` y lo evalúa contra
 * `request.user.rol`. Corresponde 1:1 con la columna "Auth Required" de
 * docs/DESIGN.md §5 para cada endpoint. Sin este decorador, `RolesGuard`
 * solo exige que haya un usuario autenticado (cualquier rol).
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
