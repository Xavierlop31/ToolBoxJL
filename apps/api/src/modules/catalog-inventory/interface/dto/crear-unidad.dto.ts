import { IsString, IsUUID, MinLength } from "class-validator";
import type { ToolUnitInput } from "@toolboxjl/shared-types";

/** POST /inventory/units (RF-1.2). */
export class CrearUnidadDto implements ToolUnitInput {
  @IsUUID()
  modelo_id!: string;

  @IsString()
  @MinLength(1)
  numero_serie!: string;
}
