import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import type { Session } from '@supabase/supabase-js';
import { firstValueFrom, isObservable } from 'rxjs';

import { adminGuard, authGuard, logisticaGuard, sessionGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { DeviceIdService } from './device-id.service';
import { DeviceVerificationService } from './device-verification.service';

/**
 * Ambos guards devuelven un Observable (esperan `auth.sessionLoaded()` antes
 * de decidir — ver la nota en auth.guard.ts sobre la carrera con la
 * hidratación asíncrona de la sesión de Supabase). Esto normaliza el
 * resultado a una Promise para poder testearlo con `await`.
 */
function resolveGuardResult(result: unknown) {
  return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);
}

describe('authGuard', () => {
  const fakeSession = { user: { id: 'user-1' } } as unknown as Session;

  function runGuard(options: {
    session: Session | null;
    verified?: boolean;
  }) {
    const authServiceStub = {
      session: () => options.session,
      sessionLoaded: signal(true),
    };
    const deviceIdStub = { deviceId: 'device-1' };
    const deviceVerificationStub = {
      isVerified: () => options.verified ?? false,
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
        { provide: DeviceIdService, useValue: deviceIdStub },
        { provide: DeviceVerificationService, useValue: deviceVerificationStub },
      ],
    });

    return resolveGuardResult(
      TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/home' } as never)),
    );
  }

  it('permite el acceso cuando hay sesión activa y el dispositivo está verificado', async () => {
    const result = await runGuard({ session: fakeSession, verified: true });
    expect(result).toBeTrue();
  });

  it('redirige a /login cuando no hay sesión', async () => {
    const result = (await runGuard({ session: null })) as UrlTree;
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/login');
  });

  it('redirige a /verificar-dispositivo cuando hay sesión pero el dispositivo no está verificado (HU-6.2)', async () => {
    const result = (await runGuard({ session: fakeSession, verified: false })) as UrlTree;
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/verificar-dispositivo');
  });
});

describe('sessionGuard', () => {
  function runGuard(isAuthenticated: boolean) {
    const authServiceStub = {
      isAuthenticated: () => isAuthenticated,
      sessionLoaded: signal(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    return resolveGuardResult(
      TestBed.runInInjectionContext(() =>
        sessionGuard({} as never, { url: '/verificar-dispositivo' } as never),
      ),
    );
  }

  it('permite el acceso a /verificar-dispositivo con sesión activa, sin exigir dispositivo verificado', async () => {
    const result = await runGuard(true);
    expect(result).toBeTrue();
  });

  it('redirige a /login si no hay sesión', async () => {
    const result = (await runGuard(false)) as UrlTree;
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/login');
  });
});

describe('adminGuard', () => {
  function runGuard(options: { isAuthenticated: boolean; isAdminOrGerente: boolean }) {
    const authServiceStub = {
      isAuthenticated: () => options.isAuthenticated,
      isAdminOrGerente: () => options.isAdminOrGerente,
      sessionLoaded: signal(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    return resolveGuardResult(
      TestBed.runInInjectionContext(() => adminGuard({} as never, { url: '/admin' } as never)),
    );
  }

  it('permite acceso si el usuario es admin o gerente', async () => {
    const result = await runGuard({ isAuthenticated: true, isAdminOrGerente: true });
    expect(result).toBeTrue();
  });

  it('redirige a /home si el usuario no es admin ni gerente', async () => {
    const result = (await runGuard({ isAuthenticated: true, isAdminOrGerente: false })) as UrlTree;
    const router = TestBed.inject(Router);
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/home');
  });

  it('redirige a /login si no está autenticado', async () => {
    const result = (await runGuard({ isAuthenticated: false, isAdminOrGerente: false })) as UrlTree;
    const router = TestBed.inject(Router);
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/login');
  });
});

describe('logisticaGuard', () => {
  function runGuard(options: { isAuthenticated: boolean; isLogistica: boolean }) {
    const authServiceStub = {
      isAuthenticated: () => options.isAuthenticated,
      isLogistica: () => options.isLogistica,
      sessionLoaded: signal(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    return resolveGuardResult(
      TestBed.runInInjectionContext(() => logisticaGuard({} as never, { url: '/logistica' } as never)),
    );
  }

  it('permite acceso a usuarios con permisos de logística', async () => {
    const result = await runGuard({ isAuthenticated: true, isLogistica: true });
    expect(result).toBeTrue();
  });

  it('redirige a /home a usuarios sin permisos de logística (ej. cliente)', async () => {
    const result = (await runGuard({ isAuthenticated: true, isLogistica: false })) as UrlTree;
    const router = TestBed.inject(Router);
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/home');
  });

  it('redirige a /login si no está autenticado', async () => {
    const result = (await runGuard({ isAuthenticated: false, isLogistica: false })) as UrlTree;
    const router = TestBed.inject(Router);
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/login');
  });
});

