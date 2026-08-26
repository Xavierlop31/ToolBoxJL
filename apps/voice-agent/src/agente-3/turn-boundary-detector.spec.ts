import { TurnBoundaryDetector } from "./turn-boundary-detector";

function frameDeSilencio(sampleRate: number, samplesPerChannel: number) {
  return { samples: new Int16Array(samplesPerChannel), sampleRate };
}

function frameDeHabla(sampleRate: number, samplesPerChannel: number, amplitud = 10000) {
  const samples = new Int16Array(samplesPerChannel);
  for (let i = 0; i < samples.length; i++) {
    // Onda simple, suficiente para superar el umbral RMS default (0.02).
    samples[i] = Math.round(amplitud * Math.sin((2 * Math.PI * i) / 20));
  }
  return { samples, sampleRate };
}

describe("TurnBoundaryDetector", () => {
  const SAMPLE_RATE = 16000;
  const FRAME_MS = 20;
  const SAMPLES_POR_FRAME = (SAMPLE_RATE * FRAME_MS) / 1000; // 320

  it("no cierra el turno mientras solo hay silencio (antes de que el cliente hable)", () => {
    const detector = new TurnBoundaryDetector();
    for (let i = 0; i < 50; i++) {
      const cerrado = detector.procesarFrame(frameDeSilencio(SAMPLE_RATE, SAMPLES_POR_FRAME));
      expect(cerrado).toBe(false);
    }
    expect(detector.detectoHablaEnEsteTurno).toBe(false);
  });

  it("no cierra el turno mientras el cliente sigue hablando", () => {
    const detector = new TurnBoundaryDetector();
    for (let i = 0; i < 20; i++) {
      const cerrado = detector.procesarFrame(frameDeHabla(SAMPLE_RATE, SAMPLES_POR_FRAME));
      expect(cerrado).toBe(false);
    }
    expect(detector.detectoHablaEnEsteTurno).toBe(true);
  });

  it("cierra el turno tras suficiente silencio DESPUÉS de haber detectado habla", () => {
    const detector = new TurnBoundaryDetector({ silencioMsParaCerrarTurno: 100 });
    // Habla: un frame supera el umbral.
    expect(detector.procesarFrame(frameDeHabla(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    // Silencio: a 20ms por frame, hacen falta 5 frames para acumular 100ms.
    expect(detector.procesarFrame(frameDeSilencio(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    expect(detector.procesarFrame(frameDeSilencio(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    expect(detector.procesarFrame(frameDeSilencio(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    expect(detector.procesarFrame(frameDeSilencio(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    expect(detector.procesarFrame(frameDeSilencio(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(true);
  });

  it("un frame de habla en medio del silencio reinicia el conteo de silencio", () => {
    const detector = new TurnBoundaryDetector({ silencioMsParaCerrarTurno: 100 });
    expect(detector.procesarFrame(frameDeHabla(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    expect(detector.procesarFrame(frameDeSilencio(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    expect(detector.procesarFrame(frameDeSilencio(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    // El cliente retoma la palabra: reinicia el conteo de silencio.
    expect(detector.procesarFrame(frameDeHabla(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    expect(detector.procesarFrame(frameDeSilencio(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    expect(detector.procesarFrame(frameDeSilencio(SAMPLE_RATE, SAMPLES_POR_FRAME))).toBe(false);
    // Todavía no llegó a 100ms de silencio consecutivo desde el reinicio.
  });

  it("reset() limpia el estado para reusar la instancia en el próximo turno", () => {
    const detector = new TurnBoundaryDetector({ silencioMsParaCerrarTurno: 20 });
    detector.procesarFrame(frameDeHabla(SAMPLE_RATE, SAMPLES_POR_FRAME));
    expect(detector.detectoHablaEnEsteTurno).toBe(true);
    detector.reset();
    expect(detector.detectoHablaEnEsteTurno).toBe(false);
  });
});
