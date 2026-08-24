import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from "class-validator";
import type { ToolModelInput } from "@toolboxjl/shared-types";

/**
 * POST /inventory/models (RF-1.1) — refleja `ToolModelInput` de
 * openapi.yaml: exige `nombre`, `marca`, `categoria`, `tarifa_dia`; el resto
 * es opcional.
 */
export class CrearModeloDto implements ToolModelInput {
  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsString()
  @MinLength(1)
  marca!: string;

  @IsString()
  @MinLength(1)
  categoria!: string;

  @IsNumber()
  @Min(0)
  tarifa_dia!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  potencia_w?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peso_kg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volumen_m3?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifa_semana?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo_compra?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deposito_pct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interes_mora_dia?: number;

  @IsOptional()
  @IsUrl()
  manual_pdf_url?: string;

  @IsOptional()
  @IsBoolean()
  disponible_para_venta?: boolean;
}
