/**
 * El JWT es válido y trae un rol reconocido, pero `app_metadata.activo` es
 * `false` — un admin desactivó esta cuenta (Épica 16, `PATCH
 * /admin/users/{id}`). Distinta de `TokenInvalidoError`: el token en sí no
 * tiene ningún problema, es la cuenta la que no tiene permiso de acceso.
 */
export class CuentaDesactivadaError extends Error {
  constructor() {
    super("Esta cuenta fue desactivada. Contactá a un administrador de ToolBox JL.");
    this.name = "CuentaDesactivadaError";
  }
}
