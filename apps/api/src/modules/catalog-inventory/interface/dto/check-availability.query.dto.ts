import { IsDateString, IsUUID } from "class-validator";

/** GET /inventory/check-availability (RF-1.4). */
export class CheckAvailabilityQueryDto {
  @IsUUID()
  modelo_id!: string;

  @IsDateString()
  fecha_inicio!: string;

  @IsDateString()
  fecha_fin!: string;
}
