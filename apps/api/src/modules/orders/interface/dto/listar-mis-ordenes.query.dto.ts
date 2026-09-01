import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Min } from "class-validator";
import type { EstadoOrden } from "@toolboxjl/shared-types";

const ESTADOS_ORDEN: EstadoOrden[] = [
  "pendiente_pago",
  "confirmada",
  "en_curso",
  "devuelta",
  "cerrada",
  "cancelada",
];

/** GET /orders — filtros aceptados por el contrato openapi.yaml (HU-12.1). */
export class ListarMisOrdenesQueryDto {
  @IsOptional()
  @IsIn(ESTADOS_ORDEN)
  estado?: EstadoOrden;

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
