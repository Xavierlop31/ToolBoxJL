import { IsBoolean, IsIn, IsOptional } from "class-validator";
import { ROLES_HUMANOS, type RolHumano } from "@toolboxjl/shared-types";

/**
 * `PATCH /admin/users/{id}` — ambos campos opcionales, pero se exige al
 * menos uno (validado en `AdminUsersController`, no acá: class-validator no
 * tiene un decorador nativo de "al menos uno de N campos opcionales" sin
 * escribir un `ValidatorConstraint` custom, y un `if` simple en el
 * controller alcanza para este caso).
 *
 * `rol` se limita a `ROLES_HUMANOS` (no `ROLES`): un admin nunca debería
 * poder asignarle a un usuario un rol de servicio de Agente de IA
 * (`agente-1`/`agente-2`) desde este panel.
 */
export class ActualizarUsuarioDto {
  @IsOptional()
  @IsIn(ROLES_HUMANOS)
  rol?: RolHumano;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
