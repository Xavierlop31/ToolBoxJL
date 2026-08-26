/**
 * Detección de fin de turno (fin de habla) — versión SIMPLIFICADA, por
 * TURNOS en vez de streaming continuo (decisión de arquitectura documentada
 * en el prompt de este sprint: "si armar un pipeline 100% streaming resulta
 * demasiado para el plazo, es aceptable implementar por turnos usando
 * detección de fin-de-habla").
 *
 * `@livekit/rtc-node` NO expone un evento de "fin de habla"/VAD listo para
 * usar (solo entrega `AudioFrame`s PCM crudos vía `AudioStream`, ver
 * `livekit/room-session.ts`) — un VAD "de verdad" (ej. Silero, que sí usa el
 * framework `@livekit/agents`) es un modelo de ML aparte, fuera de alcance
 * del plazo de este sprint. En su lugar, implementamos un detector de
 * silencio por energía RMS: mientras el cliente habla, la energía de los
 * frames se mantiene por encima de `umbralRms`; cuando cae por debajo
 * durante `silencioMsParaCerrarTurno` consecutivos DESPUÉS de haber detectado
 * habla real, se considera terminado el turno. Es un heurístico barato y
 * 100% testeable sin audio real ni red — el gap documentado es que es más
 * sensible a ruido de fondo que un VAD entrenado; aceptable para el demo.
 */

export interface TurnBoundaryDetectorOptions {
  /** Energía RMS (0-1, sobre muestras Int16 normalizadas) por encima de la cual un frame se considera "habla". Default: 0.02 (empírico, conservador). */
  umbralRms?: number;
  /** Milisegundos de silencio consecutivo (tras haber detectado habla) que cierran el turno. Default: 700ms — el mismo orden de magnitud que usan los VAD de LiveKit Agents por default. */
  silencioMsParaCerrarTurno?: number;
}

export interface FrameParaDeteccion {
  /** Muestras PCM Int16 mono de este frame. */
  samples: Int16Array;
  sampleRate: number;
}

const UMBRAL_RMS_DEFAULT = 0.02;
const SILENCIO_MS_DEFAULT = 700;

function calcularRms(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let sumaCuadrados = 0;
  for (let i = 0; i < samples.length; i++) {
    const normalizado = samples[i] / 32768;
    sumaCuadrados += normalizado * normalizado;
  }
  return Math.sqrt(sumaCuadrados / samples.length);
}

/**
 * Acumula frames de un turno y decide, frame a frame, si el turno terminó.
 * Instancia NUEVA por turno (o reseteable vía `reset()`) — vive dentro de
 * `livekit/room-session.ts`, una por sala activa.
 */
export class TurnBoundaryDetector {
  private readonly umbralRms: number;
  private readonly silencioMsParaCerrarTurno: number;
  private huboHabla = false;
  private msSilencioAcumulados = 0;

  constructor(options: TurnBoundaryDetectorOptions = {}) {
    this.umbralRms = options.umbralRms ?? UMBRAL_RMS_DEFAULT;
    this.silencioMsParaCerrarTurno = options.silencioMsParaCerrarTurno ?? SILENCIO_MS_DEFAULT;
  }

  reset(): void {
    this.huboHabla = false;
    this.msSilencioAcumulados = 0;
  }

  get detectoHablaEnEsteTurno(): boolean {
    return this.huboHabla;
  }

  /**
   * Procesa un frame y devuelve `true` si, con este frame, el turno se
   * considera terminado (hubo habla real y luego suficiente silencio).
   * Frames de puro silencio ANTES de que el cliente empiece a hablar nunca
   * cierran el turno (evita cortar en cero si hay unos ms de silencio al
   * conectar).
   */
  procesarFrame(frame: FrameParaDeteccion): boolean {
    const rms = calcularRms(frame.samples);
    const duracionMsFrame = (frame.samples.length / frame.sampleRate) * 1000;

    if (rms >= this.umbralRms) {
      this.huboHabla = true;
      this.msSilencioAcumulados = 0;
      return false;
    }

    if (!this.huboHabla) {
      // Silencio antes de que el cliente empezara a hablar — no cuenta.
      return false;
    }

    this.msSilencioAcumulados += duracionMsFrame;
    return this.msSilencioAcumulados >= this.silencioMsParaCerrarTurno;
  }
}
