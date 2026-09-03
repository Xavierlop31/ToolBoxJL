import { TestBed } from '@angular/core/testing';

import { ReturnIntentService } from './return-intent.service';

describe('ReturnIntentService', () => {
  const STORAGE_KEY = 'tbjl_return_intent';
  const TTL_MS = 30 * 60 * 1000;

  let service: ReturnIntentService;

  beforeEach(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    service = TestBed.inject(ReturnIntentService);
  });

  afterEach(() => sessionStorage.removeItem(STORAGE_KEY));

  it('guarda el intento en sessionStorage con la url actual, los datos y un timestamp', () => {
    const datos = { modeloId: 'abc-123', cantidad: 2 };

    service.guardarIntento(datos);

    const raw = sessionStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();

    const stored = JSON.parse(raw as string);
    expect(stored.url).toBe(window.location.pathname);
    expect(stored.datos).toEqual(datos);
    expect(typeof stored.ts).toBe('number');
  });

  it('recupera un intento reciente y lo elimina de sessionStorage (consumo único)', () => {
    const datos = { modeloId: 'abc-123' };
    service.guardarIntento(datos);

    const recuperado = service.recuperarIntento<typeof datos>();

    expect(recuperado).not.toBeNull();
    expect(recuperado?.datos).toEqual(datos);
    expect(recuperado?.url).toBe(window.location.pathname);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('devuelve null cuando no hay ningún intento guardado', () => {
    expect(service.recuperarIntento()).toBeNull();
  });

  it('devuelve null y descarta el intento si ya expiró el TTL de 30 minutos', () => {
    const payload = {
      url: '/portal/modelos/abc-123',
      datos: { modeloId: 'abc-123' },
      ts: Date.now() - (TTL_MS + 1000),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const recuperado = service.recuperarIntento();

    expect(recuperado).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('devuelve null sin lanzar excepción si el contenido guardado es JSON inválido', () => {
    sessionStorage.setItem(STORAGE_KEY, '{esto no es json valido');

    const recuperado = service.recuperarIntento();

    expect(recuperado).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('recupera un intento guardado justo dentro del límite del TTL', () => {
    const payload = {
      url: '/portal/modelos/abc-123',
      datos: { modeloId: 'abc-123' },
      ts: Date.now() - (TTL_MS - 1000),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const recuperado = service.recuperarIntento();

    expect(recuperado).not.toBeNull();
    expect(recuperado?.datos).toEqual(payload.datos);
  });
});
