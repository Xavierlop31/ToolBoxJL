import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js';

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
      signInWithPassword: jasmine
        .createSpy('signInWithPassword')
        .and.returnValue(Promise.resolve({ data: {}, error: null })),
      signUp: jasmine
        .createSpy('signUp')
        .and.returnValue(Promise.resolve({ data: {}, error: null })),
      signInWithOAuth: jasmine
        .createSpy('signInWithOAuth')
        .and.returnValue(Promise.resolve({ data: {}, error: null })),
      signOut: jasmine
        .createSpy('signOut')
        .and.returnValue(Promise.resolve({ error: null })),
      updateUser: jasmine
        .createSpy('updateUser')
        .and.returnValue(Promise.resolve({ data: {}, error: null })),
    },
  } as unknown as SupabaseClient;

  return {
    client,
    emitAuthState: (event: string, session: Session | null) =>
      authStateCallback(event, session),
  };
}

describe('AuthService', () => {
  function setup() {
    const { client, emitAuthState } = createSupabaseClientMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SUPABASE_CLIENT, useValue: client },
      ],
    });
    const service = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    return { service, client, emitAuthState, router };
  }

  it('arranca sin sesión y sin autenticar', () => {
    const { service } = setup();
    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('actualiza la sesión cuando Supabase emite onAuthStateChange', () => {
    const { service, emitAuthState } = setup();
    const fakeSession = { user: { id: 'u1' } } as unknown as Session;

    emitAuthState('SIGNED_IN', fakeSession);

    expect(service.session()).toBe(fakeSession);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('signInWithPassword delega en supabase.auth.signInWithPassword', async () => {
    const { service, client } = setup();

    const result = await service.signInWithPassword('a@b.com', 'secret123');

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret123',
    });
    expect(result.error).toBeNull();
  });

  it('signInWithPassword propaga el error de Supabase Auth', async () => {
    const { service, client } = setup();
    const authError = { message: 'Credenciales inválidas' } as AuthError;
    (client.auth.signInWithPassword as jasmine.Spy).and.returnValue(
      Promise.resolve({ data: {}, error: authError }),
    );

    const result = await service.signInWithPassword('a@b.com', 'wrong');

    expect(result.error).toBe(authError);
  });

  it('signInWithGoogle delega en supabase.auth.signInWithOAuth con provider "google"', async () => {
    const { service, client } = setup();

    await service.signInWithGoogle();

    expect(client.auth.signInWithOAuth).toHaveBeenCalledWith(
      jasmine.objectContaining({ provider: 'google' }),
    );
  });

  it('signUp delega en supabase.auth.signUp', async () => {
    const { service, client } = setup();

    await service.signUp('nuevo@b.com', 'secret123', '+573001234567');

    expect(client.auth.signUp).toHaveBeenCalledWith(
      jasmine.objectContaining({
        email: 'nuevo@b.com',
        password: 'secret123',
        options: jasmine.objectContaining({
          emailRedirectTo: jasmine.any(String),
          data: jasmine.objectContaining({ telefono: '+573001234567' }),
        }),
      }),
    );
  });

  it('actualizarTelefono delega en supabase.auth.updateUser', async () => {
    const { service, client } = setup();

    const result = await service.actualizarTelefono('+573001234567');

    expect(client.auth.updateUser).toHaveBeenCalledWith({
      data: { telefono: '+573001234567' },
    });
    expect(result.error).toBeNull();
  });

  it('actualizarTelefono propaga el error de Supabase Auth', async () => {
    const { service, client } = setup();
    const authError = { message: 'No se pudo actualizar' } as AuthError;
    (client.auth.updateUser as jasmine.Spy).and.returnValue(
      Promise.resolve({ data: {}, error: authError }),
    );

    const result = await service.actualizarTelefono('+573001234567');

    expect(result.error).toBe(authError);
  });

  it('signOut delega en supabase.auth.signOut y navega a /login', async () => {
    const { service, client, router } = setup();
    const navigateSpy = spyOn(router, 'navigate');

    await service.signOut();

    expect(client.auth.signOut).toHaveBeenCalled();
    expect(service.session()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  describe('RBAC y extracción de roles', () => {
    const rolesTestCases = [
      {
        rol: 'admin',
        display: 'Administrador',
        isCliente: false,
        isAdminOrGerente: true,
        isLogistica: true,
      },
      {
        rol: 'gerente',
        display: 'Gerente',
        isCliente: false,
        isAdminOrGerente: true,
        isLogistica: true,
      },
      {
        rol: 'almacenista',
        display: 'Almacenista',
        isCliente: false,
        isAdminOrGerente: false,
        isLogistica: true,
      },
      {
        rol: 'repartidor',
        display: 'Repartidor',
        isCliente: false,
        isAdminOrGerente: false,
        isLogistica: true,
      },
      {
        rol: 'cliente',
        display: 'Cliente',
        isCliente: true,
        isAdminOrGerente: false,
        isLogistica: false,
      },
    ];

    rolesTestCases.forEach(({ rol, display, isCliente, isAdminOrGerente, isLogistica }) => {
      it(`extrae y computa correctamente los permisos para el rol: ${rol}`, () => {
        const { service, emitAuthState } = setup();
        const fakeSession = {
          user: { id: `u-${rol}`, app_metadata: { rol } },
        } as unknown as Session;

        emitAuthState('SIGNED_IN', fakeSession);

        expect(service.userRole()).toBe(rol as never);
        expect(service.userRoleDisplay()).toBe(display);
        expect(service.isCliente()).toBe(isCliente);
        expect(service.isAdminOrGerente()).toBe(isAdminOrGerente);
        expect(service.isLogistica()).toBe(isLogistica);
      });
    });

    it('extrae rol desde user_metadata si no viene en app_metadata', () => {
      const { service, emitAuthState } = setup();
      const fakeSession = {
        user: { id: 'u1', user_metadata: { rol: 'gerente' } },
      } as unknown as Session;

      emitAuthState('SIGNED_IN', fakeSession);

      expect(service.userRole()).toBe('gerente');
      expect(service.isAdminOrGerente()).toBeTrue();
    });

    it('asigna cliente por defecto ante un rol no reconocido o ausente', () => {
      const { service, emitAuthState } = setup();
      const fakeSession = {
        user: { id: 'u1', user_metadata: {} },
      } as unknown as Session;

      emitAuthState('SIGNED_IN', fakeSession);

      expect(service.userRole()).toBe('cliente');
      expect(service.isCliente()).toBeTrue();
      expect(service.isAdminOrGerente()).toBeFalse();
      expect(service.isLogistica()).toBeFalse();
    });
  });
});

