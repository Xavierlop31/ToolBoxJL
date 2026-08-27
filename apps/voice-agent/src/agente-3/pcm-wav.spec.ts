import { bufferPcmAInt16Array, construirWav } from "./pcm-wav";

describe("construirWav", () => {
  it("arma un header RIFF/WAVE válido con el sample rate y canales dados", () => {
    const samples = new Int16Array([0, 100, -100, 32767, -32768]);
    const wav = construirWav(samples, 16000, 1);

    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.toString("ascii", 12, 16)).toBe("fmt ");
    expect(wav.readUInt16LE(20)).toBe(1); // formato PCM
    expect(wav.readUInt16LE(22)).toBe(1); // numChannels
    expect(wav.readUInt32LE(24)).toBe(16000); // sampleRate
    expect(wav.readUInt16LE(34)).toBe(16); // bits por muestra
    expect(wav.toString("ascii", 36, 40)).toBe("data");
    expect(wav.readUInt32LE(40)).toBe(samples.length * 2);
    expect(wav).toHaveLength(44 + samples.length * 2);
  });

  it("codifica las muestras PCM en little-endian después del header de 44 bytes", () => {
    const samples = new Int16Array([1, -1, 12345]);
    const wav = construirWav(samples, 8000, 1);
    expect(wav.readInt16LE(44)).toBe(1);
    expect(wav.readInt16LE(46)).toBe(-1);
    expect(wav.readInt16LE(48)).toBe(12345);
  });

  it("produce un WAV vacío (solo header) si no hay muestras", () => {
    const wav = construirWav(new Int16Array(0), 16000, 1);
    expect(wav).toHaveLength(44);
    expect(wav.readUInt32LE(40)).toBe(0);
  });
});

describe("bufferPcmAInt16Array", () => {
  it("reconstruye las muestras Int16 originales desde un Buffer little-endian", () => {
    const original = new Int16Array([0, 1, -1, 32767, -32768, 1234]);
    const buffer = Buffer.alloc(original.length * 2);
    original.forEach((valor, i) => buffer.writeInt16LE(valor, i * 2));

    const reconstruido = bufferPcmAInt16Array(buffer);
    expect(Array.from(reconstruido)).toEqual(Array.from(original));
  });

  it("funciona sobre un subarray/slice de un buffer más grande (offset no cero)", () => {
    const grande = Buffer.alloc(20);
    grande.writeInt16LE(999, 4);
    grande.writeInt16LE(-999, 6);
    const slice = grande.subarray(4, 8);

    const reconstruido = bufferPcmAInt16Array(slice);
    expect(Array.from(reconstruido)).toEqual([999, -999]);
  });
});
