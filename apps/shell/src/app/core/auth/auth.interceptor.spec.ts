import { TestBed } from '@angular/core/testing';
import { HttpRequest } from '@angular/common/http';
import { of } from 'rxjs';
import type { Session } from '@supabase/supabase-js';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor (shell)', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  function configure(session: Session | null): void {
    authServiceSpy = jasmine.createSpyObj('AuthService', [], { session: () => session });
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });
  }

  it('adjunta el Authorization Bearer con el access_token de la sesión activa', () => {
    configure({ access_token: 'token-shell-1' } as Session);

    const req = new HttpRequest('GET', '/api/analytics/revenue');
    const next = jasmine.createSpy('next').and.returnValue(of('handled'));

    const result = TestBed.runInInjectionContext(() => authInterceptor(req, next));

    expect(next).toHaveBeenCalledTimes(1);
    const forwardedReq = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(forwardedReq).not.toBe(req);
    expect(forwardedReq.headers.get('Authorization')).toBe('Bearer token-shell-1');
    let emitted: unknown;
    result.subscribe((value) => (emitted = value));
    expect(emitted).toBe('handled');
  });

  it('deja pasar la request sin modificar si no hay sesión activa', () => {
    configure(null);

    const req = new HttpRequest('GET', '/api/analytics/revenue');
    const next = jasmine.createSpy('next').and.returnValue(of('handled'));

    TestBed.runInInjectionContext(() => authInterceptor(req, next));

    expect(next).toHaveBeenCalledWith(req);
  });
});
