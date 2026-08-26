/**
 * Cliente ElevenLabs TTS — DUPLICADO deliberado de
 * `apps/api/src/modules/whatsapp-webhook/infrastructure/elevenlabs/elevenlabs-text-to-speech.service.ts`,
 * no importado desde ahí: `apps/workers` es un deployable independiente que
 * no depende de código de `apps/api` (mismo criterio documentado en
 * `apps/workers/src/agente-1/logistics-api-types.ts` para no compartir
 * tipos entre apps). El wrapper es chico (una llamada HTTP) — duplicarlo es
 * más barato que crear un paquete compartido nuevo para este plazo.
 *
 * *** Nunca ejercitado contra la API real en este entorno de desarrollo ***.
 */
export async function sintetizarVoz(
  texto: string,
  apiKey: string,
  voiceId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Buffer> {
  const response = await fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({ text: texto, model_id: "eleven_multilingual_v2" }),
  });

  if (!response.ok) {
    const cuerpo = await response.text().catch(() => "<no se pudo leer el cuerpo>");
    throw new Error(`ElevenLabs TTS respondió ${response.status}. Cuerpo: ${cuerpo}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
