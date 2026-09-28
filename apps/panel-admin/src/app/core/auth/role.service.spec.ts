import { TestBed } from '@angular/core/testing';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { RoleService } from './role.service';
import { SUPABASE_CLIENT } from '../supabase/supabase-client';

type AuthStateCallback = (event: string, session: Session | null) => void;

/** Mismo mock que `apps/shell/src/app/core/auth/auth.service.spec.ts` — misma sesión de Supabase, mismo patrón de extracción de rol. */
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
    emitAuthState: (event: string, session: Session | null) => authStateCallback(event, session),
  };
}

describe('RoleService', () => {
  function setup() {
    const { client, emitAuthState } = createSupabaseClientMock();
    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE_CLIENT, useValue: client }],
    });
    const service = TestBed.inject(RoleService);
    return { service, client, emitAuthState };
  }

  it('arranca en cliente y sin cargar hasta que resuelve getSession()', () => {
    const { service } = setup();
    expect(service.userRole()).toBe('cliente');
    expect(service.loaded()).toBeFalse();
  });

  (['admin', 'gerente', 'almacenista', 'repartidor', 'cliente'] as const).forEach((rol) => {
    it(`extrae el rol "${rol}" desde app_metadata`, () => {
      const { service, emitAuthState } = setup();
      const fakeSession = { user: { id: `u-${rol}`, app_metadata: { rol } } } as unknown as Session;

      emitAuthState('SIGNED_IN', fakeSession);

      expect(service.userRole()).toBe(rol);
      expect(service.loaded()).toBeTrue();
    });
  });

  it('extrae rol desde user_metadata si no viene en app_metadata', () => {
    const { service, emitAuthState } = setup();
    const fakeSession = { user: { id: 'u1', user_metadata: { rol: 'gerente' } } } as unknown as Session;

    emitAuthState('SIGNED_IN', fakeSession);

    expect(service.userRole()).toBe('gerente');
  });

  it('BUG CORREGIDO: prioriza el rol del JWT firmado sobre session.user.app_metadata desactualizado (custom_access_token_hook lo refresca en cada login, la fila de auth.users no)', () => {
    const { service, emitAuthState } = setup();
    const jwtPayload = { app_metadata: { rol: 'gerente' } };
    const fakeJwt = `header.${btoa(JSON.stringify(jwtPayload))}.signature`;
    const fakeSession = {
      access_token: fakeJwt,
      user: { id: 'u1', app_metadata: { rol: 'almacenista' } },
    } as unknown as Session;

    emitAuthState('SIGNED_IN', fakeSession);

    expect(service.userRole()).toBe('gerente');
  });

  it('asigna cliente por defecto ante un rol no reconocido o ausente', () => {
    const { service, emitAuthState } = setup();
    const fakeSession = { user: { id: 'u1', user_metadata: {} } } as unknown as Session;

    emitAuthState('SIGNED_IN', fakeSession);

    expect(service.userRole()).toBe('cliente');
  });
});
