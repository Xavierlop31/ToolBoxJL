import { Injectable } from '@angular/core';

const STORAGE_KEY = 'tbjl_return_intent';
const TTL_MS = 30 * 60 * 1000; // 30 minutos

export interface ReturnIntent<T = unknown> {
  url: string;
  datos: T;
}

interface StoredReturnIntent<T = unknown> extends ReturnIntent<T> {
  ts: number;
}

/**
 * Auth-wall (HU-11.1 parte 2): antes de mandar a un visitante sin sesión a
 * `/login`, la pantalla de origen guarda acá "qué estaba intentando hacer"
 * (ej. cotizar un modelo desde portal-cliente) para poder retomarlo al
 * volver — sin esto, el visitante llega a `/login`, inicia sesión, y pierde
 * todo lo que había llenado en el formulario.
 *
 * `sessionStorage` (no un estado en memoria): sobrevive a la navegación
 * completa de página que implica ir a `/login` y volver, y a diferencia de
 * `localStorage` se limpia solo al cerrar la pestaña — un intento
 * abandonado no queda pegado para siempre. TTL de 30 minutos como resguardo
 * adicional (`recuperarIntento()` descarta el intento si ya expiró).
 *
 * Portal-cliente (remote de Native Federation) tiene su propia copia
 * idéntica de este servicio en
 * `apps/portal-cliente/src/app/core/auth/return-intent.service.ts` — mismo
 * criterio que `SUPABASE_CLIENT` (ver la nota en
 * `apps/portal-cliente/src/app/core/auth/supabase-client.ts`): el shell no
 * expone módulos propios a sus remotes, así que no hay forma de importar
 * esta clase directo desde portal-cliente. Ambas copias se comunican por el
 * mismo `sessionStorage` del navegador (mismo origin, misma key), no por
 * compartir código.
 */
@Injectable({ providedIn: 'root' })
export class ReturnIntentService {
  guardarIntento(datos: unknown): void {
    const payload: StoredReturnIntent = {
      url: window.location.pathname,
      datos,
      ts: Date.now(),
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  recuperarIntento<T = unknown>(): ReturnIntent<T> | null {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    window.sessionStorage.removeItem(STORAGE_KEY);

    try {
      const stored = JSON.parse(raw) as StoredReturnIntent<T>;
      if (Date.now() - stored.ts > TTL_MS) {
        return null;
      }
      return { url: stored.url, datos: stored.datos };
    } catch {
      return null;
    }
  }
}
