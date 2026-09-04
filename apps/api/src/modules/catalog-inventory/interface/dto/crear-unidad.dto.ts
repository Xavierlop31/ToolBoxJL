import { IsDateString, IsInt, IsString, IsUUID, MaxLength, Min, MinLength } from "class-validator";
import type { ToolUnitInput } from "@toolboxjl/shared-types";
import { SanitizarTextoLibre } from "../../../../shared/sanitize.util";

/**
 * POST /inventory/units (RF-1.2). Sprint 14 (HU-13.2):
 * `fecha_adquisicion`/`costo_compra`/`ubicacion_bodega` son REQUERIDOS acá
 * (sin `@IsOptional()`) por conformidad con `required` en openapi.yaml —
 * ver el doc-comment de `ToolUnitInput` (`@toolboxjl/shared-types`) sobre
 * por qué el tipo de dominio los deja opcionales en cambio.
 *
 * `numero_serie`/`ubicacion_bodega` son texto libre (Issue #187): `@MaxLength`
 * + `@SanitizarTextoLibre()`.
 */
export class CrearUnidadDto implements ToolUnitInput {
  @IsUUID()
  modelo_id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @SanitizarTextoLibre()
  numero_serie!: string;

  @IsDateString()
  fecha_adquisicion!: string;

  @IsInt()
  @Min(0)
  costo_compra!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @SanitizarTextoLibre()
  ubicacion_bodega!: string;
}
