import { InjectionToken } from '@angular/core';
import { Room, RoomOptions } from 'livekit-client';

/**
 * Fábrica de instancias de `Room` (`livekit-client`).
 *
 * Se inyecta como `InjectionToken` en vez de instanciar `new Room()` directo
 * dentro de `LivekitSessionService` para poder reemplazarla por un doble de
 * prueba en tests de servicio/componente sin abrir una conexión WebRTC real
 * (mismo criterio que `SUPABASE_CLIENT` en `core/auth/supabase-client.ts`).
 */
export type LiveKitRoomFactory = (options?: RoomOptions) => Room;

export const LIVEKIT_ROOM_FACTORY = new InjectionToken<LiveKitRoomFactory>(
  'LIVEKIT_ROOM_FACTORY',
  {
    providedIn: 'root',
    factory: () => (options?: RoomOptions) => new Room(options),
  },
);
