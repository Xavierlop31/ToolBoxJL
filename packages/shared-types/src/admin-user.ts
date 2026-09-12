import type { RolHumano } from "./rol";

/**
 * Fila de `public.users` tal como la expone el panel de administración de
 * usuarios (HU-16.1/16.2, Épica 16 — pedido directo del Arquitecto
 * 2026-09-11, no viene del PRD original). Distinta de `UsuarioBasico`
 * (`apps/api/src/modules/users/domain/user.repository.ts`, tipo interno del
 * módulo) porque esta SÍ cruza la frontera de la API — contrato de
 * `GET /admin/users` / `PATCH /admin/users/{id}` (openapi.yaml, schema `User`).
 */
export interface AdminUser {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: RolHumano;
  /**
   * Si es `false`, el usuario no puede volver a iniciar sesión (aplica desde
   * el próximo login/refresh de token — mismo criterio "next login" que el
   * cambio de rol, ver `custom_access_token_hook`). Una sesión ya activa NO
   * se corta de inmediato — decisión confirmada con el Arquitecto.
   */
  activo: boolean;
}

/** `PATCH /admin/users/{id}` — al menos uno de los dos campos, ambos opcionales. */
export interface ActualizarUsuarioInput {
  rol?: RolHumano;
  activo?: boolean;
}
