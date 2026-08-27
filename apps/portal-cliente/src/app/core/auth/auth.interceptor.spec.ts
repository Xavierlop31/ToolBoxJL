import { HttpRequest } from '@angular/common/http';
import { of } from 'rxjs';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor (portal-cliente)', () => {
  const storageKey = 'sb-abcxyz-auth-token';

  afterEach(() => localStorage.clear());

  it('adjunta el Authorization Bearer con el access_token guardado por Supabase en localStorage', () => {
    localStorage.setItem(storageKey, JSON.stringify({ access_token: 'token-abc-123' }));

    const req = new HttpRequest('GET', '/api/catalog/search');
    const next = jasmine.createSpy('next').and.returnValue(of('handled'));

    const result = authInterceptor(req, next);

    expect(next).toHaveBeenCalledTimes(1);
    const forwardedReq = next.calls.mostRecent().args[0] as HttpRequest<unknown>;
    expect(forwardedReq).not.toBe(req);
    expect(forwardedReq.headers.get('Authorization')).toBe('Bearer token-abc-123');
    let emitted: unknown;
    result.subscribe((value) => (emitted = value));
    expect(emitted).toBe('handled');
  });

  it('deja pasar la request sin modificar si no hay ninguna clave de sesión de Supabase', () => {
    const req = new HttpRequest('GET', '/api/catalog/search');
    const next = jasmine.createSpy('next').and.returnValue(of('handled'));

    authInterceptor(req, next);

    expect(next).toHaveBeenCalledWith(req);
  });

  it('deja pasar la request sin modificar si la sesión guardada no tiene access_token', () => {
    localStorage.setItem(storageKey, JSON.stringify({ refresh_token: 'r1' }));

    const req = new HttpRequest('GET', '/api/catalog/search');
    const next = jasmine.createSpy('next').and.returnValue(of('handled'));

    authInterceptor(req, next);

    expect(next).toHaveBeenCalledWith(req);
  });

  it('deja pasar la request sin modificar y no lanza si el valor guardado no es JSON válido', () => {
    localStorage.setItem(storageKey, 'no-es-json{{{');
    spyOn(console, 'error');

    const req = new HttpRequest('GET', '/api/catalog/search');
    const next = jasmine.createSpy('next').and.returnValue(of('handled'));

    expect(() => authInterceptor(req, next)).not.toThrow();
    expect(next).toHaveBeenCalledWith(req);
    expect(console.error).toHaveBeenCalled();
  });

  it('ignora claves de localStorage que no corresponden al formato de sesión de Supabase', () => {
    localStorage.setItem('otra-clave-cualquiera', JSON.stringify({ access_token: 'no-deberia-usarse' }));

    const req = new HttpRequest('GET', '/api/catalog/search');
    const next = jasmine.createSpy('next').and.returnValue(of('handled'));

    authInterceptor(req, next);

    expect(next).toHaveBeenCalledWith(req);
  });
});
