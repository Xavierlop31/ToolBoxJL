/**
 * Contrato de `POST /voice-agent/livekit-token` (openapi.yaml) — Agente 3,
 * Conserje de Voz (HU-10.1/10.2, TRD §4.3). Sin body: el backend arma la
 * sala LiveKit del Cliente autenticado (Bearer JWT de Supabase) y devuelve
 * credenciales de corta duración para que el widget se conecte directo al
 * servidor LiveKit desde el navegador.
 */
export interface VoiceAgentCredentials {
  /** URL del servidor LiveKit (wss://...). */
  url: string;
  /** Token de acceso de corta duración del participante. */
  token: string;
  /** Nombre de la sala LiveKit. */
  room: string;
}

/**
 * Eventos que el Agente 3 (`apps/voice-agent`, `voice-agent-event.ts`)
 * publica por el canal de DATOS de LiveKit — HU-14.1 (saludo proactivo) y
 * HU-14.2 (chips de tool-calling en vivo), Épica 14, Sprint 13 (Fase 3).
 * Espeja intencionalmente el contrato del backend (mismo criterio que
 * `VoiceAgentCredentials` arriba, que espeja `POST
 * /voice-agent/livekit-token`): `apps/voice-agent` y `apps/portal-cliente`
 * son proyectos TS separados sin un paquete compartido para este canal
 * (a diferencia de DTOs de `apps/api`, que sí viven en
 * `@toolboxjl/shared-types`) — si este contrato cambia, hay que actualizar
 * los dos lados.
 */
export type VoiceAgentEvent =
  | { type: 'greeting'; text: string }
  | { type: 'tool_status'; tool: string; label: string; status: 'running' | 'done' };
