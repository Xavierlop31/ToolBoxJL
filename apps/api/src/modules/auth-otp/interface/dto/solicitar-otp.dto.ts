import { IsNotEmpty, IsString } from "class-validator";

/** DTO de `POST /auth/otp/request` (openapi.yaml). */
export class SolicitarOtpDto {
  @IsString()
  @IsNotEmpty()
  device_id!: string;
}
