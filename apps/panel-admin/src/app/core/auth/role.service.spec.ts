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

  // La extracción de rol en sí (precedencia JWT vs. app_metadata, el bug de
  // "rol de sesión desactualizado" y todos sus casos borde) se prueba
  // exhaustivamente en packages/shared-types/src/extract-rol.spec.ts
  // (`extractRolDeSesion`) — acá solo se ejercita que RoleService la
  // conecta correctamente a sus signals, para no duplicar esos casos en
  // 2 apps (causó un Quality Gate de SonarCloud por duplicación de código).

  it('arranca en cliente y sin cargar hasta que resuelve getSession()', () => {
    const { service } = setup();
    expect(service.userRole()).toBe('cliente');
    expect(service.loaded()).toBeFalse();
  });

  it('expone el rol resuelto por extractRolDeSesion y marca loaded en true tras onAuthStateChange', () => {
    const { service, emitAuthState } = setup();
    const fakeSession = { user: { id: 'u1', app_metadata: { rol: 'gerente' } } } as unknown as Session;

    emitAuthState('SIGNED_IN', fakeSession);

    expect(service.userRole()).toBe('gerente');
    expect(service.loaded()).toBeTrue();
  });
});
