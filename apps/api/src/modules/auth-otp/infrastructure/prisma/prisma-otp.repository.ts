import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";
import type { NuevoOtpInput, OtpRegistrado, OtpRepository } from "../../domain/otp.repository";
import type { Otp as PrismaOtp } from "@prisma/client";

function aDominio(o: PrismaOtp): OtpRegistrado {
  return {
    id: o.id,
    usuarioId: o.usuarioId,
    deviceId: o.deviceId,
    codigoHash: o.codigoHash,
    expiraEn: o.expiraEn,
    consumidoAt: o.consumidoAt,
    createdAt: o.createdAt,
  };
}

@Injectable()
export class PrismaOtpRepository implements OtpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async crear(input: NuevoOtpInput): Promise<OtpRegistrado> {
    const creado = await this.prisma.otp.create({
      data: {
        usuarioId: input.usuarioId,
        deviceId: input.deviceId,
        codigoHash: input.codigoHash,
        expiraEn: input.expiraEn,
      },
    });
    return aDominio(creado);
  }

  async buscarPorId(id: string): Promise<OtpRegistrado | null> {
    const encontrado = await this.prisma.otp.findUnique({ where: { id } });
    return encontrado ? aDominio(encontrado) : null;
  }

  async marcarConsumido(id: string): Promise<void> {
    await this.prisma.otp.update({
      where: { id },
      data: { consumidoAt: new Date() },
    });
  }

  async contarSolicitudesRecientes(usuarioId: string, deviceId: string, desde: Date): Promise<number> {
    return this.prisma.otp.count({
      where: { usuarioId, deviceId, createdAt: { gte: desde } },
    });
  }
}
