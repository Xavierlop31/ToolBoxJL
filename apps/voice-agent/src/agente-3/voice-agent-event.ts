/**
 * Eventos que el Agente 3 publica por el canal de DATOS de LiveKit
 * (`LocalParticipant.publishData`, `@livekit/rtc-node`) hacia el widget del
 * Portal Cliente — HU-14.1 (saludo proactivo) y HU-14.2 (chips de
 * tool-calling en vivo), Épica 14, Sprint 13 (Fase 3).
 *
 * Hasta Sprint 9 el widget de voz solo usaba el canal de AUDIO de LiveKit —
 * ver el ADR de alcance en `apps/portal-cliente/.../voice-widget.component.ts`
 * (comentario de cabecera, "ALCANCE CONFIRMADO CON EL ARQUITECTO"). Este es
 * el primer uso del canal de datos: el frontend lo decodifica en
 * `LivekitSessionService` (`RoomEvent.DataReceived`).
 *
 * Formato: JSON serializado a `Uint8Array` (UTF-8) — la forma exacta que
 * exige `LocalParticipant.publishData(data: Uint8Array, options)`.
 */
export type VoiceAgentEvent =
  | { type: "greeting"; text: string }
  | { type: "tool_status"; tool: string; label: string; status: "running" | "done" };

/** Serializa un `VoiceAgentEvent` a la forma exacta que espera `LocalParticipant.publishData`. */
export function codificarVoiceAgentEvent(evento: VoiceAgentEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(evento));
}

/**
 * Labels humanos de las 3 tools reales que despacha `despacharToolUse`
 * (ver `tools.ts`, `AGENTE_3_TOOLS`) — el texto que ve el Cliente en los
 * chips de HU-14.2. Fallback genérico para cualquier tool futura no
 * mapeada acá todavía (no debería pasar hoy: `AGENTE_3_TOOLS` solo declara
 * estas 3), para no dejar un chip sin texto si el set de tools crece antes
 * de actualizar este mapa.
 */
const TOOL_LABELS: Record<string, string> = {
  search_catalog: "Buscando en catálogo…",
  check_availability: "Verificando disponibilidad…",
  add_to_cart: "Agregando al carrito…",
};

export function etiquetaDeTool(toolName: string): string {
  return TOOL_LABELS[toolName] ?? `Ejecutando ${toolName}…`;
}
