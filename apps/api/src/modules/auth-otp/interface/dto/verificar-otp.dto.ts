import { IsNotEmpty, IsString, IsUUID, Matches, MaxLength } from "class-validator";
import { SanitizarTextoLibre } from "../../../../shared/sanitize.util";

/**
 * DTO de `POST /auth/otp/verify` (openapi.yaml). `codigo`: 6 dígitos exactos
 * (ya estrictamente acotado por `@Matches`, no necesita sanitización
 * adicional). `device_id` es texto libre (Issue #187): `@MaxLength` +
 * `@SanitizarTextoLibre()`.
 */
export class VerificarOtpDto {
  @IsUUID()
  otp_id!: string;

  @Matches(/^\d{6}$/, { message: "codigo debe ser exactamente 6 dígitos." })
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @SanitizarTextoLibre()
  device_id!: string;
}
