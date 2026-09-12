import { VoiceAgentEvent } from '../../core/models/voice-agent.models';

/** Un turno de la conversación mostrado en el widget (HU-14.3). */
export interface TranscriptMessage {
  role: 'user' | 'agent';
  text: string;
}

/**
 * Deriva la conversación completa (HU-14.3, pedido directo del Arquitecto
 * 2026-09-11) a partir del log ordenado de `VoiceAgentEvent` recibidos por el
 * canal de datos de LiveKit (`LivekitSessionService.events()`) — función
 * pura, sin estado propio, mismo criterio que `buildToolChips` en
 * `tool-chips.ts`.
 *
 * El saludo proactivo (`greeting`, HU-14.1) se trata como el primer mensaje
 * del agente: es el mismo tipo de contenido (texto que el agente "dijo") que
 * un evento `transcript`/`agent` posterior, solo que llega antes de que haya
 * ningún turno del Cliente. `tool_status` (HU-14.2) no forma parte de la
 * conversación — esos eventos ya se renderizan aparte, como chips.
 */
export function buildTranscriptMessages(events: readonly VoiceAgentEvent[]): TranscriptMessage[] {
  const mensajes: TranscriptMessage[] = [];

  for (const evento of events) {
    if (evento.type === 'greeting') {
      mensajes.push({ role: 'agent', text: evento.text });
    } else if (evento.type === 'transcript') {
      mensajes.push({ role: evento.role, text: evento.text });
    }
  }

  return mensajes;
}
