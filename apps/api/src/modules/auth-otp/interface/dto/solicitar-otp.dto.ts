import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { SanitizarTextoLibre } from "../../../../shared/sanitize.util";

/**
 * DTO de `POST /auth/otp/request` (openapi.yaml). `device_id` es texto libre
 * (Issue #187): `@MaxLength` + `@SanitizarTextoLibre()`.
 */
export class SolicitarOtpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @SanitizarTextoLibre()
  device_id!: string;
}
