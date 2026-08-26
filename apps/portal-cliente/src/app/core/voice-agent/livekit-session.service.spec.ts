import { TestBed } from '@angular/core/testing';
import { Room, RoomEvent, Track } from 'livekit-client';

import { LIVEKIT_ROOM_FACTORY } from './livekit-room-factory';
import { LivekitSessionService } from './livekit-session.service';

type Listener = (...args: unknown[]) => void;

/**
 * Doble de prueba de `Room` (`livekit-client`) — nunca abre una conexión
 * WebRTC real. Permite disparar los eventos (`emit`) que
 * `LivekitSessionService` escucha para verificar las transiciones de
 * estado sin un servidor LiveKit real (documentado también en el prompt de
 * la tarea: el escenario Gherkin completo de latencia/voz no es testeable
 * end-to-end sin infraestructura real).
 */
class FakeRoom {
  readonly listeners = new Map<string, Listener[]>();
  readonly connectSpy = jasmine.createSpy('connect').and.returnValue(Promise.resolve());
  readonly disconnectSpy = jasmine.createSpy('disconnect').and.returnValue(Promise.resolve());
  readonly setMicrophoneEnabledSpy = jasmine
    .createSpy('setMicrophoneEnabled')
    .and.returnValue(Promise.resolve());

  readonly localParticipant = {
    setMicrophoneEnabled: (enabled: boolean) => this.setMicrophoneEnabledSpy(enabled),
  };

  on(event: string, cb: Listener): this {
    const arr = this.listeners.get(event) ?? [];
    arr.push(cb);
    this.listeners.set(event, arr);
    return this;
  }

  connect(url: string, token: string): Promise<void> {
    return this.connectSpy(url, token);
  }

  disconnect(): Promise<void> {
    return this.disconnectSpy();
  }

  emit(event: string, ...args: unknown[]): void {
    for (const cb of this.listeners.get(event) ?? []) cb(...args);
  }
}

function createFakeAudioTrack() {
  const element = document.createElement('audio');
  return {
    kind: Track.Kind.Audio,
    attach: jasmine.createSpy('attach').and.returnValue(element),
    detach: jasmine.createSpy('detach').and.returnValue([element]),
  };
}

describe('LivekitSessionService', () => {
  let service: LivekitSessionService;
  let fakeRoom: FakeRoom;

  beforeEach(() => {
    fakeRoom = new FakeRoom();
    TestBed.configureTestingModule({
      providers: [
        { provide: LIVEKIT_ROOM_FACTORY, useValue: () => fakeRoom as unknown as Room },
      ],
    });
    service = TestBed.inject(LivekitSessionService);
  });

  const credentials = {
    url: 'wss://livekit.sandbox.toolboxjl.dev',
    token: 'jwt-livekit-token',
    room: 'sala-cliente-123',
  };

  it('arranca en estado idle', () => {
    expect(service.state()).toBe('idle');
  });

  it('connect() conecta a la sala, publica el micrófono y termina en listening', async () => {
    await service.connect(credentials);

    expect(fakeRoom.connectSpy).toHaveBeenCalledWith(credentials.url, credentials.token);
    expect(fakeRoom.setMicrophoneEnabledSpy).toHaveBeenCalledWith(true);
    expect(service.state()).toBe('listening');
    expect(service.errorMessage()).toBeNull();
  });

  it('pasa por connecting antes de resolver', () => {
    const promise = service.connect(credentials);
    expect(service.state()).toBe('connecting');
    return promise;
  });

  it('deja el estado en error y expone errorMessage si falla la conexión', async () => {
    fakeRoom.connectSpy.and.returnValue(Promise.reject(new Error('No se pudo abrir la sala')));

    await expectAsync(service.connect(credentials)).toBeRejected();

    expect(service.state()).toBe('error');
    expect(service.errorMessage()).toBe('No se pudo abrir la sala');
  });

  it('deja el estado en error si falla el permiso de micrófono', async () => {
    fakeRoom.setMicrophoneEnabledSpy.and.returnValue(
      Promise.reject(new Error('Permiso de micrófono denegado')),
    );

    await expectAsync(service.connect(credentials)).toBeRejected();

    expect(service.state()).toBe('error');
    expect(service.errorMessage()).toBe('Permiso de micrófono denegado');
  });

  it('pasa a speaking cuando llega un track remoto de audio y adjunta el elemento al DOM', async () => {
    await service.connect(credentials);
    const track = createFakeAudioTrack();

    fakeRoom.emit(RoomEvent.TrackSubscribed, track, {});

    expect(service.state()).toBe('speaking');
    expect(track.attach).toHaveBeenCalled();
  });

  it('vuelve a listening cuando el track remoto de audio se desuscribe', async () => {
    await service.connect(credentials);
    const track = createFakeAudioTrack();
    fakeRoom.emit(RoomEvent.TrackSubscribed, track, {});
    expect(service.state()).toBe('speaking');

    fakeRoom.emit(RoomEvent.TrackUnsubscribed, track);

    expect(service.state()).toBe('listening');
  });

  it('ActiveSpeakersChanged con el Cliente hablando pasa a listening', async () => {
    await service.connect(credentials);

    fakeRoom.emit(RoomEvent.ActiveSpeakersChanged, [{ isLocal: true }]);

    expect(service.state()).toBe('listening');
  });

  it('ActiveSpeakersChanged sin nadie hablando pasa a thinking', async () => {
    await service.connect(credentials);

    fakeRoom.emit(RoomEvent.ActiveSpeakersChanged, []);

    expect(service.state()).toBe('thinking');
  });

  it('ActiveSpeakersChanged no pisa el estado speaking', async () => {
    await service.connect(credentials);
    const track = createFakeAudioTrack();
    fakeRoom.emit(RoomEvent.TrackSubscribed, track, {});

    fakeRoom.emit(RoomEvent.ActiveSpeakersChanged, []);

    expect(service.state()).toBe('speaking');
  });

  it('disconnect() cierra la sala y vuelve a idle', async () => {
    await service.connect(credentials);

    await service.disconnect();

    expect(fakeRoom.disconnectSpy).toHaveBeenCalled();
    expect(service.state()).toBe('idle');
  });

  it('el evento Disconnected de la sala también vuelve el estado a idle', async () => {
    await service.connect(credentials);

    fakeRoom.emit(RoomEvent.Disconnected);

    expect(service.state()).toBe('idle');
  });

  it('disconnect() sin sesión activa no falla', async () => {
    await expectAsync(service.disconnect()).toBeResolved();
    expect(service.state()).toBe('idle');
  });
});
