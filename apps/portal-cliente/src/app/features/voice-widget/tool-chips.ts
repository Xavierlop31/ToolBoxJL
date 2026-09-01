import { VoiceAgentEvent } from '../../core/models/voice-agent.models';

/** Un chip de acción en curso/completada (HU-14.2) — una entrada por CADA invocación de tool, no por nombre de tool (la misma tool puede correr varias veces en la sesión). */
export interface ToolChip {
  tool: string;
  label: string;
  status: 'running' | 'done';
}

/**
 * Deriva la lista de chips de tool-calling (HU-14.2) a partir del log
 * ordenado de `VoiceAgentEvent` recibidos por el canal de datos de LiveKit
 * (`LivekitSessionService.events()`) — función pura, sin estado propio, para
 * que sea testeable sin Angular/LiveKit.
 *
 * Cada evento `tool_status`/`running` agrega un chip nuevo. Un evento
 * `tool_status`/`done` no agrega un chip nuevo: busca, de atrás para
 * adelante, el chip `running` más reciente con el mismo `tool` y lo marca
 * `done` — así una misma tool que corre más de una vez en la sesión (ej. dos
 * `search_catalog` en turnos distintos) queda representada como dos chips
 * independientes, cada uno con su propia transición running→done, en vez de
 * pisarse entre sí.
 */
export function buildToolChips(events: readonly VoiceAgentEvent[]): ToolChip[] {
  const chips: ToolChip[] = [];

  for (const evento of events) {
    if (evento.type !== 'tool_status') continue;

    if (evento.status === 'running') {
      chips.push({ tool: evento.tool, label: evento.label, status: 'running' });
      continue;
    }

    for (let i = chips.length - 1; i >= 0; i--) {
      if (chips[i].tool === evento.tool && chips[i].status === 'running') {
        chips[i] = { ...chips[i], status: 'done' };
        break;
      }
    }
  }

  return chips;
}
