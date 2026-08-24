import type { Rol } from "@toolboxjl/shared-types";

/** El usuario está autenticado pero su rol no está entre los roles permitidos del recurso. */
export class AccesoDenegadoError extends Error {
  constructor(
    public readonly rolUsuario: Rol,
    public readonly rolesPermitidos: readonly Rol[],
  ) {
    super(
      `El rol "${rolUsuario}" no tiene acceso a este recurso (roles permitidos: ${rolesPermitidos.join(", ")}).`,
    );
    this.name = "AccesoDenegadoError";
  }
}
