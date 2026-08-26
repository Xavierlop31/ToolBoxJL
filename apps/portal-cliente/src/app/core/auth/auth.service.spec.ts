import { TestBed } from '@angular/core/testing';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from './supabase-client';

type AuthStateCallback = (event: string, session: Session | null) => void;

function createSupabaseClientMock() {
  let authStateCallback: AuthStateCallback = () => undefined;

  const client = {
    auth: {
      getSession: jasmine
        .createSpy('getSession')
        .and.returnValue(Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jasmine
        .createSpy('onAuthStateChange')
        .and.callFake((cb: AuthStateCallback) => {
          authStateCallback = cb;
          return { data: { subscription: { unsubscribe: () => undefined } } };
        }),
    },
  } as unknown as SupabaseClient;

  return {
    client,
    emitAuthState: (event: string, session: Session | null) =>
      authStateCallback(event, session),
  };
}

describe('AuthService (portal-cliente)', () => {
  function setup() {
    const { client, emitAuthState } = createSupabaseClientMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE_CLIENT, useValue: client }],
    });
    const service = TestBed.inject(AuthService);
    return { service, client, emitAuthState };
  }

  it('arranca sin sesión y sin autenticar', () => {
    const { service } = setup();
    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('marca sessionLoaded en true una vez resuelta la sesión inicial', async () => {
    const { service } = setup();
    await Promise.resolve();
    expect(service.sessionLoaded()).toBeTrue();
  });

  it('se autentica cuando Supabase emite onAuthStateChange con sesión', () => {
    const { service, emitAuthState } = setup();
    const fakeSession = { user: { id: 'cliente-1' } } as unknown as Session;

    emitAuthState('SIGNED_IN', fakeSession);

    expect(service.session()).toBe(fakeSession);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('vuelve a desautenticarse cuando Supabase emite sesión null (logout)', () => {
    const { service, emitAuthState } = setup();
    emitAuthState('SIGNED_IN', { user: { id: 'cliente-1' } } as unknown as Session);
    emitAuthState('SIGNED_OUT', null);

    expect(service.isAuthenticated()).toBeFalse();
  });
});
