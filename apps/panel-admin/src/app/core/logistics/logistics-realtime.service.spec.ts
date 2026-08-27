import { TestBed } from '@angular/core/testing';

import { LogisticsRealtimeService } from './logistics-realtime.service';
import { SUPABASE_CLIENT } from '../supabase/supabase-client';

describe('LogisticsRealtimeService', () => {
  let service: LogisticsRealtimeService;
  let channelMock: {
    on: jasmine.Spy;
    subscribe: jasmine.Spy;
    unsubscribe: jasmine.Spy;
  };
  let supabaseMock: {
    channel: jasmine.Spy;
    auth: { getSession: jasmine.Spy };
    realtime: { setAuth: jasmine.Spy };
  };

  beforeEach(() => {
    channelMock = {
      on: jasmine.createSpy('on').and.callFake(function (this: unknown) {
        return channelMock;
      }),
      subscribe: jasmine.createSpy('subscribe').and.callFake(function (this: unknown) {
        return channelMock;
      }),
      unsubscribe: jasmine.createSpy('unsubscribe'),
    };

    supabaseMock = {
      channel: jasmine.createSpy('channel').and.returnValue(channelMock),
      auth: {
        getSession: jasmine.createSpy('getSession').and.resolveTo({
          data: { session: { access_token: 'token-123' } },
        }),
      },
      realtime: { setAuth: jasmine.createSpy('setAuth') },
    };

    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE_CLIENT, useValue: supabaseMock }],
    });

    service = TestBed.inject(LogisticsRealtimeService);
  });

  it('RF-3.3: autentica el canal Realtime con el access_token de la sesión activa y se suscribe a la tabla shipments', async () => {
    const emitted: unknown[] = [];
    const sub = service.watchShipments().subscribe((payload) => emitted.push(payload));

    // Esperar a que se resuelva la promesa async de getSession()/setAuth().
    await Promise.resolve();
    await Promise.resolve();

    expect(supabaseMock.channel).toHaveBeenCalledWith('shipments-realtime');
    expect(supabaseMock.auth.getSession).toHaveBeenCalled();
    expect(supabaseMock.realtime.setAuth).toHaveBeenCalledWith('token-123');
    expect(channelMock.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'shipments' },
      jasmine.any(Function),
    );
    expect(channelMock.subscribe).toHaveBeenCalled();

    sub.unsubscribe();
  });

  it('propaga cada payload emitido por el canal al Observable', async () => {
    const emitted: unknown[] = [];
    const sub = service.watchShipments().subscribe((payload) => emitted.push(payload));

    await Promise.resolve();
    await Promise.resolve();

    const onCallback = channelMock.on.calls.mostRecent().args[2] as (payload: unknown) => void;
    const fakePayload = { eventType: 'INSERT', new: { id: 's1' }, old: {} };
    onCallback(fakePayload);

    expect(emitted).toEqual([fakePayload]);

    sub.unsubscribe();
  });

  it('no llama a setAuth si no hay sesión activa', async () => {
    supabaseMock.auth.getSession.and.resolveTo({ data: { session: null } });

    const sub = service.watchShipments().subscribe();
    await Promise.resolve();
    await Promise.resolve();

    expect(supabaseMock.realtime.setAuth).not.toHaveBeenCalled();
    expect(channelMock.subscribe).toHaveBeenCalled();

    sub.unsubscribe();
  });

  it('desuscribe el canal al hacer teardown del Observable', async () => {
    const sub = service.watchShipments().subscribe();
    await Promise.resolve();
    await Promise.resolve();

    sub.unsubscribe();

    expect(channelMock.unsubscribe).toHaveBeenCalled();
  });

  it('propaga un error si falla la obtención de la sesión', async () => {
    supabaseMock.auth.getSession.and.rejectWith(new Error('sesión inválida'));

    let receivedError: unknown = null;
    const sub = service.watchShipments().subscribe({
      error: (err) => {
        receivedError = err;
      },
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(receivedError).toBeTruthy();
    sub.unsubscribe();
  });
});
