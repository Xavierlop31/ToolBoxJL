import { AGENTE_3_BOT_IDENTITY_PREFIX } from "./agent-token";

/**
 * Decisión de "¿debo unirme a esta sala?" a partir de un webhook de LiveKit
 * (`room_started`/`participant_joined`/etc., ver
 * https://docs.livekit.io/home/server/webhooks/ — nombres de evento
 * confirmados contra `WebhookEventNames` de `livekit-server-sdk`). Función
 * PURA, desacoplada del tipo real `WebhookEvent` de `livekit-server-sdk`
 * (protobuf, con métodos, no testeable con fixtures livianos) para poder
 * testear la lógica de negocio sin construir un mensaje protobuf real — ver
 * `webhook-http-server.ts` para el mapeo del evento real a este shape
 * mínimo.
 *
 * Disparador elegido: `participant_joined` (no `room_started`). Motivo: el
 * cliente recién tiene sus metadata (JWT de Supabase, ver `../metadata.ts`)
 * seteados AL UNIRSE — esperar a `participant_joined` garantiza que, cuando
 * el bot se conecte y lea `room.remoteParticipants`, el JWT ya esté
 * disponible. `room_started` puede dispararse antes de que el cliente
 * termine de unirse.
 */

export interface WebhookEventoMinimo {
  event: string;
  room?: { name?: string };
  participant?: { identity?: string };
}

export interface DecisionUnionSala {
  debeUnirse: boolean;
  roomName?: string;
  motivo: string;
}

export function decidirSiUnirseASala(evento: WebhookEventoMinimo): DecisionUnionSala {
  if (evento.event !== "participant_joined") {
    return {
      debeUnirse: false,
      motivo: `Evento "${evento.event}" ignorado — el Agente 3 solo actúa sobre "participant_joined".`,
    };
  }

  const identity = evento.participant?.identity ?? "";
  if (identity.startsWith(AGENTE_3_BOT_IDENTITY_PREFIX)) {
    return {
      debeUnirse: false,
      motivo: `El participante "${identity}" es el propio bot del Agente 3 — se ignora para no unirse a su propia sala en loop.`,
    };
  }

  const roomName = evento.room?.name;
  if (!roomName) {
    return { debeUnirse: false, motivo: 'El evento "participant_joined" no trae room.name — no se puede unir.' };
  }

  return { debeUnirse: true, roomName, motivo: `Cliente "${identity}" se unió a la sala "${roomName}" — el Agente 3 se une.` };
}
