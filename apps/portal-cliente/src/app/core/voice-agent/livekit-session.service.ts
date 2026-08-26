import { Injectable, inject, signal } from '@angular/core';
import { RemoteTrack, Room, RoomEvent, Track } from 'livekit-client';

import { VoiceAgentCredentials } from '../models/voice-agent.models';
import { LIVEKIT_ROOM_FACTORY } from './livekit-room-factory';

/**
 * Estado de UI del widget de voz (HU-10.1/10.2, TRD §4.3). No hace falta un
 * visualizador de audio: alcanza con distinguir estos 6 estados para la
 * demo:
 *  - `idle`: sin sesión activa.
 *  - `connecting`: conectando a LiveKit + pidiendo el micrófono.
 *  - `listening`: sesión activa, el Cliente está hablando (o en silencio
 *    esperando para hablar) y el agente está capturando su audio.
 *  - `thinking`: heurística best-effort (ver `registerListeners`) — nadie
 *    está hablando (ni el Cliente ni el agente) mientras la sesión sigue
 *    activa; probablemente el Agente 3 está procesando la solicitud.
 *  - `speaking`: llegó un track de audio remoto (la respuesta TTS del
 *    agente, ElevenLabs vía LiveKit) y se está reproduciendo.
 *  - `error`: falló la conexión o el permiso de micrófono.
 */
export type VoiceAgentUiState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

/**
 * Maneja el ciclo de vida de una sesión LiveKit del widget de voz —
 * conexión WebRTC, publicación del micrófono del Cliente y reproducción
 * automática del audio remoto (la voz del Agente 3, TTS de ElevenLabs
 * streameado de vuelta por LiveKit, TRD §4.3).
 *
 * El proceso del Agente 3 (`apps/voice-agent`, a cargo de `ia-agentes`) es
 * quien hace el tool calling real (`GET /catalog/search`, `POST
 * /cart/add-item`) — este servicio es puramente de transporte de audio en el
 * navegador, no conoce nada de esa lógica.
 */
@Injectable({ providedIn: 'root' })
export class LivekitSessionService {
  private readonly roomFactory = inject(LIVEKIT_ROOM_FACTORY);

  private room: Room | null = null;
  private readonly attachedAudioElements = new Set<HTMLMediaElement>();

  private readonly stateSignal = signal<VoiceAgentUiState>('idle');
  private readonly errorMessageSignal = signal<string | null>(null);

  readonly state = this.stateSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();

  /**
   * Conecta a la sala LiveKit con las credenciales de `POST
   * /voice-agent/livekit-token` y publica el micrófono del navegador.
   * Rechaza (y deja `state()` en `'error'`) si la conexión WebRTC o el
   * permiso de micrófono fallan — el widget debe mostrar
   * `errorMessage()` en ese caso.
   */
  async connect(credentials: VoiceAgentCredentials): Promise<void> {
    this.stateSignal.set('connecting');
    this.errorMessageSignal.set(null);

    const room = this.roomFactory();
    this.room = room;
    this.registerListeners(room);

    try {
      await room.connect(credentials.url, credentials.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      this.stateSignal.set('listening');
    } catch (error) {
      this.stateSignal.set('error');
      this.errorMessageSignal.set(this.toErrorMessage(error));
      await this.teardown();
      throw error;
    }
  }

  /** Cierra la sesión (si hay una activa) y libera los elementos de audio. */
  async disconnect(): Promise<void> {
    await this.teardown();
    this.stateSignal.set('idle');
  }

  private registerListeners(room: Room): void {
    // Llega un track remoto: es la voz del Agente 3 (TTS de ElevenLabs)
    // streameada de vuelta por LiveKit. Se adjunta a un <audio> para
    // reproducción automática (RoomEvent.TrackSubscribed entrega el track ya
    // listo para `.attach()`, ver docs de livekit-client v2).
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio) return;

      const element = track.attach() as HTMLMediaElement;
      element.autoplay = true;
      // No se agrega al DOM visible del widget: es solo reproducción de
      // audio, sin UI propia. Se mantiene fuera de pantalla para que
      // funcione igual si el navegador exige que el elemento esté adjunto
      // al documento para reproducir audio.
      element.style.display = 'none';
      document.body.appendChild(element);
      this.attachedAudioElements.add(element);

      this.stateSignal.set('speaking');
    });

    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio) return;

      for (const element of track.detach()) {
        element.remove();
        this.attachedAudioElements.delete(element);
      }

      // Terminó de hablar el agente: vuelve a "escuchando" (no hay señal
      // explícita de LiveKit para "el agente terminó su turno y ahora te
      // escucha", así que se asume que el turno vuelve al Cliente).
      if (this.stateSignal() === 'speaking') {
        this.stateSignal.set('listening');
      }
    });

    // Heurística best-effort para distinguir "escuchando" (el Cliente está
    // hablando) de "pensando" (silencio de ambos lados mientras el Agente 3
    // procesa la solicitud, TRD §4.3) — LiveKit no expone un evento propio
    // de "el agente está pensando"; eso solo lo sabría el proceso del
    // Agente 3 (`apps/voice-agent`, fuera de este remote). Se ignora
    // mientras el agente está hablando (`state() === 'speaking'`) para no
    // pisar ese estado con el nivel de audio del Cliente.
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      if (this.stateSignal() === 'speaking') return;

      const clienteHablando = speakers.some((participant) => participant.isLocal);
      this.stateSignal.set(clienteHablando ? 'listening' : 'thinking');
    });

    room.on(RoomEvent.Disconnected, () => {
      this.detachAllAudioElements();
      this.room = null;
      this.stateSignal.set('idle');
    });
  }

  private async teardown(): Promise<void> {
    const room = this.room;
    this.room = null;
    this.detachAllAudioElements();

    if (room) {
      try {
        await room.disconnect();
      } catch {
        // El teardown no debe fallar por un error de desconexión — ya se
        // limpiaron los elementos de audio y el estado se resetea igual.
      }
    }
  }

  private detachAllAudioElements(): void {
    for (const element of this.attachedAudioElements) {
      element.remove();
    }
    this.attachedAudioElements.clear();
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'No pudimos conectar con el asistente de voz. Intenta de nuevo.';
  }
}
