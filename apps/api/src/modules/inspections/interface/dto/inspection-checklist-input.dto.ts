import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  ValidateNested,
} from "class-validator";
import type {
  Hallazgo,
  InspectionChecklistInput,
  SeveridadHallazgo,
  TipoInspeccion,
} from "@toolboxjl/shared-types";

/** Elemento de `hallazgos` — `POST /inspections`. */
export class HallazgoDto implements Hallazgo {
  @IsString()
  descripcion!: string;

  @IsEnum(["leve", "moderada", "grave"])
  severidad!: SeveridadHallazgo;
}

/**
 * DTO de `POST /inspections` — `InspectionChecklistInput` de openapi.yaml.
 * `hallazgos`/`fotos_urls` son opcionales ahí (un checklist de salida sin
 * novedades, o uno de recepción sin evidencia adicional, son válidos).
 */
export class InspectionChecklistInputDto implements InspectionChecklistInput {
  @IsUUID()
  unidad_id!: string;

  @IsUUID()
  shipment_id!: string;

  @IsEnum(["salida", "recepcion"])
  tipo!: TipoInspeccion;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HallazgoDto)
  hallazgos?: HallazgoDto[];

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  fotos_urls?: string[];
}
