import { Injectable } from "@nestjs/common";
import type { DeviceVerificationRepository } from "../../domain/device-verification.repository";

@Injectable()
export class InMemoryDeviceVerificationRepository implements DeviceVerificationRepository {
  private readonly verificados = new Set<string>();

  private clave(usuarioId: string, deviceId: string): string {
    return `${usuarioId}::${deviceId}`;
  }

  async estaVerificado(usuarioId: string, deviceId: string): Promise<boolean> {
    return this.verificados.has(this.clave(usuarioId, deviceId));
  }

  async marcarVerificado(usuarioId: string, deviceId: string): Promise<void> {
    this.verificados.add(this.clave(usuarioId, deviceId));
  }
}
