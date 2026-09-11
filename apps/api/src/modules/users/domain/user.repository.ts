import type { RolHumano } from "@toolboxjl/shared-types";

/**
 * Forma mínima de `public.users` que necesita cualquier caso de uso de este
 * repo para mostrar un nombre — NO es el schema `User` de openapi.yaml (ese
 * schema existe en el contrato pero, al momento de este sprint, ningún
 * endpoint lo referencia — ver `#/components/schemas/User`), así que no vive
 * en `@toolboxjl/shared-types` (que solo declara tipos que cruzan la
 * frontera de la API). Es un tipo interno de este módulo.
 *
 * Épica 16 (Gestión de Usuarios y Roles): agrega `activo` — esta interfaz
 * pasó a ser también la forma que consume `AdminUsersController`
 * (mapeada 1:1 a `AdminUser`, `@toolboxjl/shared-types`), no solo
 * `LogisticsModule`.
 */
export interface UsuarioBasico {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: RolHumano;
  activo: boolean;
}

/** Filtros de `UserRepository.listar` — `GET /admin/users` (Épica 16). */
export interface FiltroListarUsuarios {
  /** Búsqueda libre por nombre o email (contains, case-insensitive). */
  q?: string;
  rol?: RolHumano;
  activo?: boolean;
  page: number;
  pageSize: number;
}

/** Campos que `PATCH /admin/users/{id}` puede modificar — ambos opcionales, al menos uno presente (lo valida el DTO/use case, no el repositorio). */
export interface CambiosUsuario {
  rol?: RolHumano;
  activo?: boolean;
}

/**
 * Puerto de repositorio de `public.users`.
 *
 * Hasta Épica 16 (Gestión de Usuarios y Roles, Sprint 14→acá) era de SOLO
 * LECTURA a propósito: la única fuente de escritura era el trigger
 * `handle_new_user` de Supabase. `listar`/`actualizar` son los PRIMEROS
 * métodos de escritura de este puerto — reservados a
 * `AdminUsersController` (`@Roles("admin")` únicamente, ver ese controller),
 * ningún otro módulo debe invocarlos.
 */
export interface UserRepository {
  buscarPorId(id: string): Promise<UsuarioBasico | null>;
  /** `GET /admin/users` — página de usuarios humanos (nunca agente-1/agente-2, que no son filas de esta tabla), ordenados por nombre. */
  listar(filtro: FiltroListarUsuarios): Promise<{ items: UsuarioBasico[]; total: number }>;
  /** `PATCH /admin/users/{id}` — `null` si `id` no existe. */
  actualizar(id: string, cambios: CambiosUsuario): Promise<UsuarioBasico | null>;
}
