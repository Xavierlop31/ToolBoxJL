import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  function runGuard(isAuthenticated: boolean) {
    const authServiceStub = { isAuthenticated: () => isAuthenticated };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    return TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/home' } as never),
    );
  }

  it('permite el acceso cuando hay sesión activa', () => {
    const result = runGuard(true);
    expect(result).toBeTrue();
  });

  it('redirige a /login cuando no hay sesión', () => {
    const result = runGuard(false) as UrlTree;
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result)).toBe('/login');
  });
});
