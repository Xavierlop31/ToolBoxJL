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
 *
 * `telefono` (Sprint 6, HU-6.2 — AuthOtpModule) es OPCIONAL a propósito:
 * ningún claim de teléfono existía en el JWT antes de este campo, así que
 * se agregó como opcional para no romper ningún call site existente que ya
 * construye un `UsuarioAutenticado` sin ese dato (BDD steps de sprints
 * anteriores, tests). Se puebla en `VerificarAccesoUseCase` desde
 * `app_metadata.telefono`/`user_metadata.telefono` del JWT — mismo patrón
 * que el claim de `rol`. Es una asunción documentada, no confirmada contra
 * un proyecto Supabase real (ver `TelefonoNoDisponibleError` en
 * `auth-otp/domain/errors` para el detalle y el pedido de confirmación al
 * Arquitecto).
 */
export interface UsuarioAutenticado {
  id: string;
  email: string | null;
  rol: Rol;
  telefono?: string | null;
}
