/**
 * Cliente de envío de WhatsApp Cloud API — DUPLICADO deliberado de
 * `apps/api/src/modules/whatsapp-webhook/infrastructure/whatsapp/whatsapp-media.service.ts`
 * (solo la mitad saliente: este job nunca descarga audio entrante). Mismo
 * criterio de duplicación entre apps documentado en `text-to-speech.ts`.
 *
 * *** Nunca ejercitado contra la API real en este entorno de desarrollo ***.
 */
const BASE_URL = "https://graph.facebook.com/v21.0";

export async function enviarNotaDeVoz(
  telefono: string,
  audio: Buffer,
  credenciales: { token: string; phoneNumberId: string },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const mediaId = await subirMedia(audio, credenciales, fetchImpl);

  const response = await fetchImpl(`${BASE_URL}/${credenciales.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credenciales.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefono,
      type: "audio",
      audio: { id: mediaId },
    }),
  });
  if (!response.ok) {
    const cuerpo = await response.text().catch(() => "<no se pudo leer el cuerpo>");
    throw new Error(`WhatsApp Cloud API respondió ${response.status} al enviar la nota de voz. Cuerpo: ${cuerpo}`);
  }
}

async function subirMedia(
  audio: Buffer,
  credenciales: { token: string; phoneNumberId: string },
  fetchImpl: typeof fetch,
): Promise<string> {
  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", "audio/mpeg");
  formData.append("file", new Blob([audio], { type: "audio/mpeg" }), "recordatorio.mp3");

  const response = await fetchImpl(`${BASE_URL}/${credenciales.phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credenciales.token}` },
    body: formData,
  });
  if (!response.ok) {
    const cuerpo = await response.text().catch(() => "<no se pudo leer el cuerpo>");
    throw new Error(`WhatsApp Cloud API respondió ${response.status} al subir el recordatorio. Cuerpo: ${cuerpo}`);
  }
  const data = (await response.json()) as { id?: string };
  if (!data.id) {
    throw new Error("WhatsApp Cloud API no devolvió un media id tras subir el recordatorio.");
  }
  return data.id;
}
