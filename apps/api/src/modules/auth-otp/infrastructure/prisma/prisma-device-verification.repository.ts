import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";
import type { DeviceVerificationRepository } from "../../domain/device-verification.repository";

@Injectable()
export class PrismaDeviceVerificationRepository implements DeviceVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async estaVerificado(usuarioId: string, deviceId: string): Promise<boolean> {
    const encontrado = await this.prisma.deviceVerification.findUnique({
      where: { usuarioId_deviceId: { usuarioId, deviceId } },
    });
    return encontrado !== null;
  }

  async marcarVerificado(usuarioId: string, deviceId: string): Promise<void> {
    await this.prisma.deviceVerification.upsert({
      where: { usuarioId_deviceId: { usuarioId, deviceId } },
      update: { verifiedAt: new Date() },
      create: { usuarioId, deviceId, verifiedAt: new Date() },
    });
  }
}
