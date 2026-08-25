import { Injectable } from '@angular/core';

const DEVICE_ID_STORAGE_KEY = 'tbjl_device_id';

/**
 * Genera y persiste un `device_id` estable en `localStorage` — el
 * "identificador estable del dispositivo/navegador generado por el
 * cliente" que pide el contrato de `POST /auth/otp/request`
 * (openapi.yaml líneas 66-106, HU-6.2, Issue #18).
 *
 * Se genera una sola vez con `crypto.randomUUID()` y se reusa en cada
 * sesión posterior desde el mismo navegador; borrar el storage del sitio
 * (o abrir en otro navegador/perfil) hace que el próximo login se trate
 * como "dispositivo nuevo" — que es exactamente el comportamiento que pide
 * el escenario Gherkin.
 */
@Injectable({ providedIn: 'root' })
export class DeviceIdService {
  private readonly deviceIdValue = this.getOrCreate();

  /** Identificador estable de este dispositivo/navegador. */
  get deviceId(): string {
    return this.deviceIdValue;
  }

  private getOrCreate(): string {
    if (typeof localStorage === 'undefined') {
      // SSR / entorno sin storage (no aplica hoy a esta SPA, pero evita un
      // crash si alguna vez se agrega prerender).
      return crypto.randomUUID();
    }

    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const generated = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  }
}
