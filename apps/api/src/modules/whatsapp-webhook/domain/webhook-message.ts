/**
 * Forma normalizada de un mensaje entrante de WhatsApp Cloud API — lo único
 * que el resto del módulo necesita conocer del payload real de Meta.
 * `waMessageId` es el `id` que Meta le asigna al mensaje (`wamid...`), usado
 * solo para logging/trazabilidad, no para idempotencia (fuera de alcance de
 * este sprint, ver comentario de cabecera de `whatsapp-webhook.controller.ts`).
 */
export interface WebhookInboundMessage {
  telefono: string;
  waMessageId: string;
  tipo: "text" | "audio";
  texto: string | null;
  audioMediaId: string | null;
}

/**
 * Parsea el payload crudo de `POST /webhooks/whatsapp` (openapi.yaml lo
 * modela como `object` libre a propósito — ver esa descripción). Forma real
 * documentada por Meta (WhatsApp Cloud API, Webhooks — Messages):
 *
 *   { entry: [{ changes: [{ value: { messages: [{ from, id, type,
 *     text: { body }, audio: { id } }], statuses: [...] } }] }] }
 *
 * `value.statuses` (confirmaciones de entrega/lectura de mensajes SALIENTES)
 * llega al mismo webhook — se ignora acá (no tiene `messages`, así que este
 * parser devuelve `[]` para esos eventos) porque este sprint no necesita
 * ese estado.
 *
 * Deliberadamente NUNCA lanza ante un payload con forma inesperada — Meta
 * reintenga la entrega si el endpoint no responde 200, así que un payload
 * raro/parcial debe degradar a "ningún mensaje" en vez de tirar abajo el
 * `catch` de arriba y arriesgar un loop de reintentos.
 */
export function extraerMensajesEntrantes(payload: unknown): WebhookInboundMessage[] {
  const mensajes: WebhookInboundMessage[] = [];

  const entries = asArray(asRecord(payload)?.entry);
  for (const entry of entries) {
    const changes = asArray(asRecord(entry)?.changes);
    for (const change of changes) {
      const value = asRecord(asRecord(change)?.value);
      const rawMessages = asArray(value?.messages);
      for (const raw of rawMessages) {
        const mensaje = normalizarMensaje(raw);
        if (mensaje) {
          mensajes.push(mensaje);
        }
      }
    }
  }

  return mensajes;
}

function normalizarMensaje(raw: unknown): WebhookInboundMessage | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }
  const from = typeof record.from === "string" ? record.from : null;
  const id = typeof record.id === "string" ? record.id : null;
  const tipo = typeof record.type === "string" ? record.type : null;
  if (!from || !id || (tipo !== "text" && tipo !== "audio")) {
    // Otros tipos (image, location, sticker, button, ...) no están en el
    // alcance de HU-9.2 (voz/texto) — se ignoran silenciosamente en vez de
    // fallar todo el batch de mensajes de este evento.
    return null;
  }

  if (tipo === "text") {
    const texto = asRecord(record.text)?.body;
    return {
      telefono: from,
      waMessageId: id,
      tipo: "text",
      texto: typeof texto === "string" ? texto : null,
      audioMediaId: null,
    };
  }

  const audioMediaId = asRecord(record.audio)?.id;
  return {
    telefono: from,
    waMessageId: id,
    tipo: "audio",
    texto: null,
    audioMediaId: typeof audioMediaId === "string" ? audioMediaId : null,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
