import type { Rol } from "@toolboxjl/shared-types";

/**
 * Forma mínima de `public.users` que necesita cualquier caso de uso de este
 * repo para mostrar un nombre — NO es el schema `User` de openapi.yaml (ese
 * schema existe en el contrato pero, al momento de este sprint, ningún
 * endpoint lo referencia — ver `#/components/schemas/User`), así que no vive
 * en `@toolboxjl/shared-types` (que solo declara tipos que cruzan la
 * frontera de la API). Es un tipo interno de este módulo.
 */
export interface UsuarioBasico {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: Rol;
}

/**
 * Puerto de repositorio de SOLO LECTURA para `public.users` (Sprint 14,
 * HU-13.4 — primer caso de uso de este repo que necesita leer esa tabla
 * desde código Node; ver el comentario de sección de `schema.prisma` sobre
 * por qué antes solo la leían las políticas RLS en SQL crudo).
 *
 * No declara `crear`/`actualizar` a propósito: la única fuente de escritura
 * de `public.users` sigue siendo el trigger `handle_new_user` de Supabase
 * (migración `20260823235900_supabase_users_bootstrap`) — este módulo nunca
 * escribe esa tabla.
 */
export interface UserRepository {
  buscarPorId(id: string): Promise<UsuarioBasico | null>;
}
