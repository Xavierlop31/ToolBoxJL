import { extraerMensajesEntrantes } from "./webhook-message";

describe("extraerMensajesEntrantes", () => {
  it("extrae un mensaje de texto entrante", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { from: "573001234567", id: "wamid.1", type: "text", text: { body: "Hola" } },
                ],
              },
            },
          ],
        },
      ],
    };

    expect(extraerMensajesEntrantes(payload)).toEqual([
      { telefono: "573001234567", waMessageId: "wamid.1", tipo: "text", texto: "Hola", audioMediaId: null },
    ]);
  });

  it("extrae un mensaje de audio (nota de voz) entrante", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "573001234567",
                    id: "wamid.2",
                    type: "audio",
                    audio: { id: "media-abc", mime_type: "audio/ogg; codecs=opus" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    expect(extraerMensajesEntrantes(payload)).toEqual([
      { telefono: "573001234567", waMessageId: "wamid.2", tipo: "audio", texto: null, audioMediaId: "media-abc" },
    ]);
  });

  it("ignora eventos de status (confirmaciones de entrega de mensajes salientes)", () => {
    const payload = {
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.3", status: "delivered" }] } }] }],
    };

    expect(extraerMensajesEntrantes(payload)).toEqual([]);
  });

  it("ignora tipos de mensaje fuera de alcance (ej. imagen) sin fallar", () => {
    const payload = {
      entry: [
        {
          changes: [
            { value: { messages: [{ from: "573001234567", id: "wamid.4", type: "image", image: { id: "x" } }] } },
          ],
        },
      ],
    };

    expect(extraerMensajesEntrantes(payload)).toEqual([]);
  });

  it("nunca lanza ante payloads con forma inesperada — devuelve []", () => {
    expect(extraerMensajesEntrantes(null)).toEqual([]);
    expect(extraerMensajesEntrantes(undefined)).toEqual([]);
    expect(extraerMensajesEntrantes({})).toEqual([]);
    expect(extraerMensajesEntrantes({ entry: "no-es-un-array" })).toEqual([]);
    expect(extraerMensajesEntrantes("string-inesperado")).toEqual([]);
  });
});
