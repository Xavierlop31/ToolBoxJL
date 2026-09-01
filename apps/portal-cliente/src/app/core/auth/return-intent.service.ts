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
 * Copia local del `ReturnIntentService` de `apps/shell` — mismo criterio de
 * duplicación que `SUPABASE_CLIENT` (ver la nota en `supabase-client.ts` de
 * este mismo directorio): el shell no expone módulos propios a sus
 * remotes, así que portal-cliente no puede importar la clase original
 * directo. Ambas copias leen/escriben la MISMA key de `sessionStorage`
 * (mismo origin), así que un intento guardado acá (ej. desde
 * `model-detail.component.ts` al interceptar `getQuote()`/`addItem()` sin
 * sesión) es recuperable después de que el shell resuelva el login,
 * aunque cada uno tenga su propia instancia de la clase.
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
