import { Transform, Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ROLES_HUMANOS, type RolHumano } from "@toolboxjl/shared-types";

/**
 * `?activo=true`/`?activo=false` llega como STRING desde query params —
 * `@Type(() => Boolean)` de class-transformer NO sirve acá (`Boolean("false")`
 * es `true`: cualquier string no vacío es truthy en JS). Se parsea a mano
 * antes de que `@IsBoolean()` lo valide.
 */
function aBooleanoDeQuery(valor: unknown): unknown {
  if (valor === "true") return true;
  if (valor === "false") return false;
  return valor;
}

/** GET /admin/users — filtros aceptados por el contrato openapi.yaml (Épica 16). */
export class ListarUsuariosQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(ROLES_HUMANOS)
  rol?: RolHumano;

  @IsOptional()
  @Transform(({ value }) => aBooleanoDeQuery(value))
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
