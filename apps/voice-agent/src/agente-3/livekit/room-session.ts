import type Anthropic from "@anthropic-ai/sdk";
import {
  AudioFrame,
  AudioSource,
  AudioStream,
  LocalAudioTrack,
  RemoteAudioTrack,
  Room,
  RoomEvent,
  TrackPublishOptions,
  TrackSource,
  type RemoteTrack,
} from "@livekit/rtc-node";
import type { LiveKitConfig } from "../config";
import { SAMPLE_RATE_PCM } from "../domain/text-to-speech.gateway";
import type { SpeechToTextGateway } from "../domain/speech-to-text.gateway";
import type { TextToSpeechGateway } from "../domain/text-to-speech.gateway";
import { extraerJwtDeSala, type ParticipanteConMetadata } from "../metadata";
import { bufferPcmAInt16Array, construirWav } from "../pcm-wav";
import { TurnBoundaryDetector } from "../turn-boundary-detector";
import { ejecutarTurnoAgente3, type AnthropicMessagesClient } from "../voice-turn-agent";
import { mintarTokenDeAgente } from "./agent-token";

/**
 * Orquestación REAL de una sesión de voz del Agente 3: se une a la sala
 * LiveKit, lee el JWT del cliente de sus metadata, se suscribe a su pista de
 * audio, acumula el turno con `TurnBoundaryDetector`, transcribe con
 * Deepgram, corre el loop de tool calling de Claude
 * (`ejecutarTurnoAgente3`), sintetiza con ElevenLabs y publica la respuesta
 * de vuelta en la sala.
 *
 * *** NO UNIT-TESTEADA — mismo criterio documentado para
 * `DeepgramSpeechToTextService`/`ElevenLabsTextToSpeechService` (Agente 2 y
 * 3): esta función depende de un servidor LiveKit real (`Room.connect`,
 * `AudioStream`, `AudioSource.captureFrame`, todos vía el binario nativo
 * `@livekit/rtc-node`) — no hay forma de mockear eso sin reescribir la mitad
 * del SDK. TODA la lógica de negocio que SÍ es testeable (extracción de JWT,
 * detección de fin de turno, empaquetado WAV, el loop de tool calling
 * completo) vive en módulos puros/inyectables que esta función solo
 * orquesta — ver `metadata.ts`, `turn-boundary-detector.ts`, `pcm-wav.ts`,
 * `voice-turn-agent.ts`, todos con specs. La validación de ESTE archivo es
 * manual/de integración real, documentada como gap explícito en el prompt de
 * este sprint ("sesión LiveKit real... no son testeables sin infraestructura
 * real").
 *
 * Pipeline por TURNOS, no streaming continuo (decisión de arquitectura
 * documentada en el prompt de este sprint) — se sacrifica algo de latencia
 * percibida (el cliente espera a que termine de hablar antes de que el
 * Agente 3 empiece a procesar, en vez de un pipeline que empieza a transcribir
 * mientras el cliente todavía habla) a cambio de reusar exactamente el mismo
 * patrón ya construido y probado para el Agente 2 (Deepgram por archivo,
 * ElevenLabs por archivo, loop de tool calling manual).
 */

export interface RoomSessionDeps {
  liveKitConfig: LiveKitConfig;
  anthropic: AnthropicMessagesClient;
  anthropicModel: string;
  apiBaseUrl: string;
  speechToText: SpeechToTextGateway;
  textToSpeech: TextToSpeechGateway;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

/** Se le pasa a `Then` cuando el llamador quiere cerrar la sesión (ej. `participant_left`/`room_finished`, ver `webhook-http-server.ts`). */
export type CerrarSesion = () => Promise<void>;

function combinarMuestras(frames: Int16Array[]): Int16Array {
  const total = frames.reduce((acumulado, frame) => acumulado + frame.length, 0);
  const combinado = new Int16Array(total);
  let offset = 0;
  for (const frame of frames) {
    combinado.set(frame, offset);
    offset += frame.length;
  }
  return combinado;
}

/**
 * El bot se une DESPUÉS del evento `participant_joined` del cliente (ver
 * `webhook-event-router.ts`), pero puede haber una condición de carrera
 * mínima entre que LiveKit entrega el webhook y que los metadata del
 * participante son visibles vía `room.remoteParticipants` desde el lado del
 * bot — reintentos cortos con backoff fijo, best-effort.
 */
async function resolverJwtConReintentos(
  room: Room,
  logger: Pick<Console, "log" | "warn" | "error">,
  intentos = 5,
  esperaMs = 300,
): Promise<string> {
  for (let intento = 1; intento <= intentos; intento++) {
    const participantes: ParticipanteConMetadata[] = Array.from(room.remoteParticipants.values()).map((p) => ({
      identity: p.identity,
      metadata: p.metadata,
    }));
    try {
      return extraerJwtDeSala(participantes);
    } catch (error) {
      if (intento === intentos) {
        throw error;
      }
      logger.warn(
        `[Agente 3] Intento ${intento}/${intentos}: todavía no se encontró el JWT del cliente en los metadata — reintentando en ${esperaMs}ms.`,
      );
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
    }
  }
  // Inalcanzable (el loop siempre retorna o lanza en la última iteración) — solo para conformidad de tipos.
  throw new Error("resolverJwtConReintentos: estado inesperado.");
}

export async function manejarSesionDeVoz(deps: RoomSessionDeps, roomName: string): Promise<CerrarSesion> {
  const logger = deps.logger ?? console;
  const { identity, token } = await mintarTokenDeAgente(deps.liveKitConfig, roomName);

  const room = new Room();
  await room.connect(deps.liveKitConfig.url, token);
  logger.log(`[Agente 3] Conectado a la sala "${roomName}" como "${identity}".`);

  const jwt = await resolverJwtConReintentos(room, logger);

  const audioSource = new AudioSource(SAMPLE_RATE_PCM, 1);
  const localTrack = LocalAudioTrack.createAudioTrack("agente-3-voz", audioSource);
  await room.localParticipant?.publishTrack(
    localTrack,
    new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE }),
  );

  let mensajes: Anthropic.MessageParam[] = [];
  const detector = new TurnBoundaryDetector();
  let muestrasTurno: Int16Array[] = [];
  let procesandoTurno = false;

  async function manejarTurno(muestras: Int16Array): Promise<void> {
    const inicio = Date.now();
    try {
      const wav = construirWav(muestras, SAMPLE_RATE_PCM, 1);
      const transcripcion = await deps.speechToText.transcribir(wav, "audio/wav");
      if (!transcripcion.trim()) {
        logger.log(`[Agente 3] Sala "${roomName}": turno sin transcripción utilizable, se ignora.`);
        return;
      }

      const resultado = await ejecutarTurnoAgente3(
        { anthropic: deps.anthropic, model: deps.anthropicModel, apiBaseUrl: deps.apiBaseUrl, jwt },
        mensajes,
        transcripcion,
      );
      mensajes = resultado.mensajes;

      const audioPcm = await deps.textToSpeech.sintetizar(resultado.respuestaTexto);
      const samplesRespuesta = bufferPcmAInt16Array(audioPcm);
      const frame = new AudioFrame(samplesRespuesta, SAMPLE_RATE_PCM, 1, samplesRespuesta.length);
      await audioSource.captureFrame(frame);

      const latenciaMs = Date.now() - inicio;
      logger.log(
        `[Agente 3] Sala "${roomName}" — turno resuelto en ${latenciaMs}ms. ` +
          `Transcripción: "${transcripcion}". Respuesta: "${resultado.respuestaTexto}". ` +
          `${resultado.carritoActualizado ? "Carrito actualizado." : ""}`,
      );
      if (latenciaMs > 2500) {
        // RNF-2 (TRD §3) — objetivo < 2.5s de principio a fin. Se loguea la
        // violación en vez de fallar: es una métrica a monitorear/optimizar,
        // no un motivo para cortar la conversación.
        logger.warn(`[Agente 3] RNF-2 excedido: turno tardó ${latenciaMs}ms (objetivo < 2500ms).`);
      }
    } catch (error) {
      logger.error(`[Agente 3] Error procesando turno en sala "${roomName}":`, error);
    }
  }

  async function procesarAudioDeParticipante(track: RemoteAudioTrack): Promise<void> {
    const audioStream = new AudioStream(track, SAMPLE_RATE_PCM, 1);
    const reader = audioStream.getReader();
    try {
      for (;;) {
        const { value: frame, done } = await reader.read();
        if (done || !frame) {
          break;
        }
        if (procesandoTurno) {
          // No se acumula audio nuevo mientras el turno anterior todavía se
          // está respondiendo — evita solapar dos turnos sobre el mismo
          // buffer. Gap documentado: el cliente puede hablar "encima" de la
          // respuesta del agente sin que se registre (mismo límite que
          // cualquier pipeline por turnos, no streaming).
          continue;
        }
        muestrasTurno.push(frame.data);
        const turnoTerminado = detector.procesarFrame({ samples: frame.data, sampleRate: frame.sampleRate });
        if (turnoTerminado) {
          const combinado = combinarMuestras(muestrasTurno);
          muestrasTurno = [];
          detector.reset();
          procesandoTurno = true;
          manejarTurno(combinado)
            .catch((error) => logger.error(`[Agente 3] Error inesperado en manejarTurno:`, error))
            .finally(() => {
              procesandoTurno = false;
            });
        }
      }
    } catch (error) {
      logger.error(`[Agente 3] Error leyendo el stream de audio de la sala "${roomName}":`, error);
    }
  }

  const onTrackSubscribed = (track: RemoteTrack): void => {
    if (!(track instanceof RemoteAudioTrack)) {
      return;
    }
    void procesarAudioDeParticipante(track);
  };
  room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);

  return async () => {
    room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
    await room.disconnect();
    logger.log(`[Agente 3] Sesión de la sala "${roomName}" cerrada.`);
  };
}
