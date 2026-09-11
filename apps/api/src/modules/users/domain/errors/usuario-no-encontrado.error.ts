/** `PATCH /admin/users/{id}` con un `id` que no existe en `public.users`. */
export class UsuarioNoEncontradoError extends Error {
  constructor(public readonly id: string) {
    super(`No existe un usuario con id "${id}".`);
    this.name = "UsuarioNoEncontradoError";
  }
}
