import type { Rol } from "@toolboxjl/shared-types";
import { AccesoDenegadoError } from "./errors/acceso-denegado.error";

/**
 * Regla de negocio de RBAC (docs/DESIGN.md §3, punto 7): dado el rol del
 * usuario autenticado y la lista de roles permitidos declarada por el
 * recurso (`@Roles(...)`), decide si hay acceso.
 *
 * Es lógica de dominio pura, sin ninguna dependencia de Nest/Passport/HTTP
 * a propósito: `RolesGuard` (interface/) es el único punto que la conecta al
 * framework, así que esta regla se puede testear (y reusar, ej. en
 * apps/workers) sin levantar un `ExecutionContext`.
 */
export class PoliticaAccesoService {
  /**
   * Sin roles permitidos declarados, el recurso solo exige estar
   * autenticado (cualquier rol pasa) — el guard de autenticación ya
   * garantiza eso antes de que este chequeo corra.
   */
  tieneAcceso(rolUsuario: Rol, rolesPermitidos: readonly Rol[]): boolean {
    if (rolesPermitidos.length === 0) {
      return true;
    }
    return rolesPermitidos.includes(rolUsuario);
  }

  /** Igual que `tieneAcceso`, pero lanza `AccesoDenegadoError` en vez de devolver `false`. */
  verificarAcceso(rolUsuario: Rol, rolesPermitidos: readonly Rol[]): void {
    if (!this.tieneAcceso(rolUsuario, rolesPermitidos)) {
      throw new AccesoDenegadoError(rolUsuario, rolesPermitidos);
    }
  }
}
