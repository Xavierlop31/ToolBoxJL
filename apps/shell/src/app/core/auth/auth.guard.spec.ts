import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import type { Session } from '@supabase/supabase-js';

import { authGuard, sessionGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { DeviceIdService } from './device-id.service';
import { DeviceVerificationService } from './device-verification.service';

describe('authGuard', () => {
  const fakeSession = { user: { id: 'user-1' } } as unknown as Session;

  function runGuard(options: {
    session: Session | null;
    verified?: boolean;
  }) {
    const authServiceStub = { session: () => options.session };
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

    return TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/home' } as never),
    );
  }

  it('permite el acceso cuando hay sesión activa y el dispositivo está verificado', () => {
    const result = runGuard({ session: fakeSession, verified: true });
    expect(result).toBeTrue();
  });

  it('redirige a /login cuando no hay sesión', () => {
    const result = runGuard({ session: null }) as UrlTree;
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/login');
  });

  it('redirige a /verificar-dispositivo cuando hay sesión pero el dispositivo no está verificado (HU-6.2)', () => {
    const result = runGuard({ session: fakeSession, verified: false }) as UrlTree;
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/verificar-dispositivo');
  });
});

describe('sessionGuard', () => {
  function runGuard(isAuthenticated: boolean) {
    const authServiceStub = { isAuthenticated: () => isAuthenticated };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    return TestBed.runInInjectionContext(() =>
      sessionGuard({} as never, { url: '/verificar-dispositivo' } as never),
    );
  }

  it('permite el acceso a /verificar-dispositivo con sesión activa, sin exigir dispositivo verificado', () => {
    const result = runGuard(true);
    expect(result).toBeTrue();
  });

  it('redirige a /login si no hay sesión', () => {
    const result = runGuard(false) as UrlTree;
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/login');
  });
});
