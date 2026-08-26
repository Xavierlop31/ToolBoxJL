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
