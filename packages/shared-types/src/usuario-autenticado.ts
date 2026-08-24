import type { Rol } from "./rol";

/**
 * Forma del usuario autenticado una vez verificado el JWT de Supabase Auth.
 *
 * Es el contrato que `SupabaseJwtStrategy` (apps/api) adjunta a
 * `request.user` y que `RolesGuard` consume para decidir acceso — y, a la
 * vez, el tipo que un frontend puede usar para tipar la sesión del usuario
 * actual (ej. para condicionar navegación/UI por rol) sin duplicar la forma.
 *
 * `id` es el `sub` del JWT (uuid, mismo valor que `auth.uid()` en Supabase /
 * `USERS.id` en el esquema — docs/DESIGN.md §4.1).
 */
export interface UsuarioAutenticado {
  id: string;
  email: string | null;
  rol: Rol;
}
