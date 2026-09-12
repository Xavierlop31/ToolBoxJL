/**
 * Un admin intentó cambiar su propio rol/estado desde `PATCH
 * /admin/users/{id}` (`id` igual al `sub` del JWT autenticado) — bloqueado a
 * propósito para que un admin no pueda auto-demoverse o desactivarse por
 * error y quedar sin acceso al propio panel que necesita para revertirlo.
 */
export class NoModificarPropioUsuarioError extends Error {
  constructor() {
    super("No podés cambiar tu propio rol o estado desde este panel.");
    this.name = "NoModificarPropioUsuarioError";
  }
}
