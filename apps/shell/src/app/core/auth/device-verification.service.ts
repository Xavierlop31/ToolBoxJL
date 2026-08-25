import { Injectable } from '@angular/core';

const VERIFIED_DEVICES_STORAGE_KEY = 'tbjl_verified_devices';

/**
 * Registro local de qué combinaciones usuario+dispositivo ya pasaron la
 * verificación por OTP de WhatsApp (HU-6.2, Issue #18).
 *
 * La fuente de verdad real vive en el backend (`device_verifications`,
 * verificada en cada `POST /auth/otp/verify`) — este registro local es solo
 * un criterio de UX para no reenviar un OTP nuevo en cada navegación desde
 * un dispositivo que la sesión actual del navegador ya sabe que está
 * verificado (decisión de alcance del Tech Lead, ver el brief del Issue
 * #18: "podés guardar localmente que ese device_id ya pasó OTP"). Si el
 * backend igualmente rechazara un intento (p. ej. el usuario cambió de
 * teléfono y el backend invalidó la verificación), el `authGuard` seguiría
 * mandando a `/verificar-dispositivo` la próxima vez que este registro
 * local se limpie (logout, otro navegador, storage borrado).
 */
@Injectable({ providedIn: 'root' })
export class DeviceVerificationService {
  isVerified(userId: string, deviceId: string): boolean {
    return this.readVerifiedSet().has(this.key(userId, deviceId));
  }

  markVerified(userId: string, deviceId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const verified = this.readVerifiedSet();
    verified.add(this.key(userId, deviceId));
    localStorage.setItem(
      VERIFIED_DEVICES_STORAGE_KEY,
      JSON.stringify([...verified]),
    );
  }

  private key(userId: string, deviceId: string): string {
    return `${userId}:${deviceId}`;
  }

  private readVerifiedSet(): Set<string> {
    if (typeof localStorage === 'undefined') {
      return new Set();
    }

    const raw = localStorage.getItem(VERIFIED_DEVICES_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set();
    } catch {
      return new Set();
    }
  }
}
