/**
 * Extracción del JWT de Supabase del cliente desde los metadata del
 * participante LiveKit (TRD §4.3, `openapi.yaml` — descripción de
 * `POST /voice-agent/livekit-token`, Sprint 9, decisión de arquitectura ya
 * confirmada con el Arquitecto: "el Agente 3 NO tiene cuenta de servicio
 * propia... el backend... embebe el JWT de Supabase del propio cliente...
 * como metadata del participante — el proceso del Agente 3 lo lee ahí y lo
 * reenvía tal cual").
 *
 * *** CONTRATO ASUMIDO — COORDINACIÓN PENDIENTE CON BACKEND (flag para el
 * Tech Lead) ***: al momento de escribir esto, `apps/api/src/modules/voice-agent/`
 * (rama `feature/backend-cart-voice-token`, en paralelo) todavía NO tiene
 * ningún archivo — no hay código real que inspeccionar para confirmar el
 * shape exacto de los metadata que `issueVoiceAgentLivekitToken` va a emitir.
 * `openapi.yaml` solo dice, en prosa, "metadata del participante" sin definir
 * un shape JSON. Definimos acá el contrato que este proceso espera, del lado
 * de LECTURA — si Backend emite un shape distinto, es un desacople real a
 * resolver en la revisión de PR (no un bug de este archivo):
 *
 *   AccessTokenOptions.metadata = JSON.stringify({ supabase_jwt: "<jwt>" })
 *
 * Es decir: un string JSON (no el JWT crudo directamente como metadata) con
 * una única clave `supabase_jwt`, en el participante del CLIENTE (el que
 * abrió el widget de voz) — NO en la sala (`Room.metadata`) ni en el
 * participante del propio Agente 3. Se eligió JSON envolvente (en vez de
 * pasar el JWT crudo como metadata) por consistencia con el resto del
 * contrato de la API (snake_case) y para dejar lugar a agregar más campos de
 * metadata en el futuro sin romper el parseo. Se recorre TODOS los
 * `room.remoteParticipants` (no un identity fijo) porque, del lado del
 * Agente 3, el participante humano puede tener cualquier identity que
 * Backend le haya asignado — no asumimos un valor fijo.
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(metadataRaw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const jwt = (parsed as Record<string, unknown>).supabase_jwt;
  return typeof jwt === "string" && jwt.trim() ? jwt.trim() : null;
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
      `(se esperaba JSON con la forma {"supabase_jwt": "<jwt>"}). Participantes revisados: ` +
      `${participantes.map((p) => p.identity).join(", ") || "<ninguno>"}. Esto probablemente significa ` +
      "que el shape de metadata que emite POST /voice-agent/livekit-token no coincide con el que " +
      "este proceso espera — ver el comentario de cabecera de metadata.ts.",
  );
}
