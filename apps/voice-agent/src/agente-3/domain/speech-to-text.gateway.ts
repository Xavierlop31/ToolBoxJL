/**
 * Puerto de dominio para transcripción de voz (TRD §4.3 — "Deepgram STT").
 * Mismo shape que `apps/api/.../whatsapp-webhook/domain/speech-to-text.gateway.ts`
 * (Agente 2) — se duplica deliberadamente en vez de importar entre apps
 * (CLAUDE.md §3 / cada app del monorepo depende solo de `packages/`, nunca de
 * otra `apps/*`).
 */
export interface SpeechToTextGateway {
  /** `mimeType` ej. "audio/wav" — ver `../pcm-wav.ts` para cómo se arma el audio del turno acumulado. */
  transcribir(audio: Buffer, mimeType: string): Promise<string>;
}
