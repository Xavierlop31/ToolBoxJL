/**
 * Extracción del JWT de Supabase del cliente desde los metadata del
 * participante LiveKit (TRD §4.3, `openapi.yaml` — descripción de
 * `POST /voice-agent/livekit-token`, Sprint 9, decisión de arquitectura ya
 * confirmada con el Arquitecto: "el Agente 3 NO tiene cuenta de servicio
 * propia... el backend... embebe el JWT de Supabase del propio cliente...
 * como metadata del participante — el proceso del Agente 3 lo lee ahí y lo
 * reenvía tal cual").
 *
 * *** CONTRATO RECONCILIADO CON BACKEND (Tech Lead, revisión de PR) ***: la
 * primera versión de este archivo asumía un shape JSON envolvente
 * (`{"supabase_jwt": "<jwt>"}`) porque, al escribirse, `apps/api/src/modules/voice-agent/`
 * (rama `feature/backend-cart-voice-token`, en paralelo) todavía no tenía
 * código que inspeccionar. Backend ya está implementado y revisado:
 * `EmitirTokenLivekitUseCase`/`LivekitAccessTokenIssuerService` ponen el JWT
 * de Supabase CRUDO directamente como `AccessTokenOptions.metadata` (sin
 * envolver en JSON) — es el mismo string que el cliente recibió como Bearer,
 * reenviado tal cual. Este archivo se corrigió para leer ese shape real.
 *
 * Se recorre TODOS los `room.remoteParticipants` (no un identity fijo)
 * porque, del lado del Agente 3, el participante humano puede tener
 * cualquier identity que Backend le haya asignado — no asumimos un valor
 * fijo. Validación mínima de "parece un JWT" (3 segmentos separados por
 * `.`, no vacíos) para no reenviar como Bearer cualquier metadata basura de
 * un participante que no sea el cliente esperado.
 */

export class MetadataJwtNoEncontradoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "MetadataJwtNoEncontradoError";
  }
}

/** Forma mínima de lo que este módulo necesita de un participante LiveKit — desacoplado del tipo real de `@livekit/rtc-node` para poder testear sin esa dependencia. */
export interface ParticipanteConMetadata {
  readonly identity: string;
  readonly metadata: string;
}

/**
 * Parsea el JWT de Supabase embebido en los metadata (JSON) de UN
 * participante. Devuelve `null` (no lanza) si ese participante puntual no
 * trae el campo esperado — quien llama decide si eso es un error fatal o si
 * debe seguir buscando en otro participante (ver `extraerJwtDeSala`).
 */
export function extraerJwtDeMetadata(metadataRaw: string | undefined | null): string | null {
  if (!metadataRaw || !metadataRaw.trim()) {
    return null;
  }
  const jwt = metadataRaw.trim();
  // Validación mínima de forma (3 segmentos no vacíos separados por ".") —
  // no decodifica ni verifica la firma acá (eso lo hace apps/api al recibir
  // el Bearer reenviado); solo evita reenviar como Authorization cualquier
  // metadata que claramente no sea un JWT.
  const segmentos = jwt.split(".");
  if (segmentos.length !== 3 || segmentos.some((segmento) => segmento.length === 0)) {
    return null;
  }
  return jwt;
}

/**
 * Busca el JWT de Supabase entre TODOS los participantes remotos de la sala
 * (el Agente 3 se une como participante "bot" y ve al cliente como remoto).
 * Si ninguno lo trae, lanza `MetadataJwtNoEncontradoError` — sin ese JWT, el
 * Agente 3 no puede llamar `POST /cart/add-item` en nombre del cliente (ver
 * guardrail del prompt: nunca inventar autenticación ni degradar a una
 * cuenta de servicio que no existe para este agente).
 */
export function extraerJwtDeSala(participantes: readonly ParticipanteConMetadata[]): string {
  for (const participante of participantes) {
    const jwt = extraerJwtDeMetadata(participante.metadata);
    if (jwt) {
      return jwt;
    }
  }
  throw new MetadataJwtNoEncontradoError(
    `Ningún participante de la sala trae un JWT de Supabase válido en sus metadata ` +
      `(se esperaba el JWT crudo, con forma de JWT válida — 3 segmentos no vacíos). ` +
      `Participantes revisados: ${participantes.map((p) => p.identity).join(", ") || "<ninguno>"}. ` +
      "Esto probablemente significa que el shape de metadata que emite " +
      "POST /voice-agent/livekit-token no coincide con el que este proceso espera — ver el " +
      "comentario de cabecera de metadata.ts.",
  );
}
