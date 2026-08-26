/**
 * Envoltorio WAV (RIFF/PCM) puro, sin dependencias — para poder reusar el
 * MISMO puerto `SpeechToTextGateway.transcribir(audio: Buffer, mimeType: string)`
 * que ya usa el Agente 2 (`apps/api/.../whatsapp-webhook/domain/speech-to-text.gateway.ts`):
 * Deepgram acepta un WAV con header estándar como `audio/wav` en
 * `POST /v1/listen`, así que en vez de mandar PCM crudo con parámetros de
 * query (`encoding=linear16&sample_rate=...`, un camino menos documentado y
 * más frágil), envolvemos las muestras Int16 acumuladas del turno en un
 * header WAV de 44 bytes — formato ampliamente soportado, trivial de
 * construir y de testear sin ninguna librería de audio externa.
 */

const HEADER_BYTES = 44;
const BITS_POR_MUESTRA = 16;

export function construirWav(samples: Int16Array, sampleRate: number, numChannels = 1): Buffer {
  const bytesPorMuestra = BITS_POR_MUESTRA / 8;
  const dataSize = samples.length * bytesPorMuestra;
  const buffer = Buffer.alloc(HEADER_BYTES + dataSize);

  const byteRate = sampleRate * numChannels * bytesPorMuestra;
  const blockAlign = numChannels * bytesPorMuestra;

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");

  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // tamaño del sub-chunk fmt (PCM = 16)
  buffer.writeUInt16LE(1, 20); // formato PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(BITS_POR_MUESTRA, 34);

  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], HEADER_BYTES + i * bytesPorMuestra);
  }

  return buffer;
}

/** Convierte un Buffer PCM crudo (Int16, little-endian) recibido de ElevenLabs (`output_format=pcm_16000`) en un `Int16Array` — usado para publicar el audio sintetizado de vuelta en la sala LiveKit vía `AudioFrame`. */
export function bufferPcmAInt16Array(buffer: Buffer): Int16Array {
  // `buffer.buffer` puede venir con un offset/longitud distinto al Buffer
  // lógico (subarray de un pool más grande) — se copia a un ArrayBuffer
  // propio y alineado para evitar leer basura fuera de rango.
  const copia = Buffer.from(buffer);
  return new Int16Array(copia.buffer, copia.byteOffset, copia.length / 2);
}
