import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NuevoOtpInput, OtpRegistrado, OtpRepository } from "../../domain/otp.repository";

@Injectable()
export class InMemoryOtpRepository implements OtpRepository {
  private readonly otps = new Map<string, OtpRegistrado>();

  async crear(input: NuevoOtpInput): Promise<OtpRegistrado> {
    const otp: OtpRegistrado = {
      id: randomUUID(),
      usuarioId: input.usuarioId,
      deviceId: input.deviceId,
      codigoHash: input.codigoHash,
      expiraEn: input.expiraEn,
      consumidoAt: null,
      createdAt: new Date(),
    };
    this.otps.set(otp.id, otp);
    return otp;
  }

  async buscarPorId(id: string): Promise<OtpRegistrado | null> {
    return this.otps.get(id) ?? null;
  }

  async marcarConsumido(id: string): Promise<void> {
    const otp = this.otps.get(id);
    if (!otp) {
      throw new Error(`No existe un OTP con id "${id}".`);
    }
    this.otps.set(id, { ...otp, consumidoAt: new Date() });
  }

  async contarSolicitudesRecientes(usuarioId: string, deviceId: string, desde: Date): Promise<number> {
    return [...this.otps.values()].filter(
      (o) => o.usuarioId === usuarioId && o.deviceId === deviceId && o.createdAt >= desde,
    ).length;
  }
}
