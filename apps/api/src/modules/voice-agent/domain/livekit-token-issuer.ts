export interface LivekitTokenParams {
  /** `identity` del participante LiveKit — se usa el `usuario.id` del cliente. */
  identity: string;
  /** Nombre único de la sala (ver EmitirTokenLivekitUseCase). */
  room: string;
  /**
   * JWT de Supabase DEL PROPIO CLIENTE (el mismo Bearer que autenticó la
   * llamada a `POST /voice-agent/livekit-token`), embebido tal cual como
   * metadata del participante — ver el comentario de
   * `EmitirTokenLivekitUseCase` para la decisión de arquitectura completa
   * (el Agente 3 no tiene cuenta de servicio propia).
   */
  metadataJwt: string;
  /** TTL del `AccessToken` de LiveKit, en segundos — sesión de voz corta. */
  ttlSegundos: number;
}

/**
 * Puerto de emisión de tokens de sala LiveKit — Clean Architecture, mismo
 * criterio que `WompiGateway`: el dominio declara la interfaz,
 * `infrastructure/` la implementa dos veces (real con `livekit-server-sdk`,
 * fake determinístico para tests/BDD).
 */
export interface LivekitTokenIssuer {
  /** URL pública (`wss://...`) del servidor LiveKit contra el que se firmó este token — se devuelve tal cual en el campo `url` de la respuesta de `POST /voice-agent/livekit-token`. */
  readonly url: string;
  emitir(params: LivekitTokenParams): Promise<string>;
}
