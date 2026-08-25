import { IsNotEmpty, IsString, IsUUID, Matches } from "class-validator";

/** DTO de `POST /auth/otp/verify` (openapi.yaml). `codigo`: 6 dígitos exactos. */
export class VerificarOtpDto {
  @IsUUID()
  otp_id!: string;

  @Matches(/^\d{6}$/, { message: "codigo debe ser exactamente 6 dígitos." })
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  device_id!: string;
}
