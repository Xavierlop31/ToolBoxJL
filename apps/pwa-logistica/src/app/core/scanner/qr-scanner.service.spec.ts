import { TestBed } from '@angular/core/testing';
import { BrowserQRCodeReader } from '@zxing/browser';
import type { Exception, Result } from '@zxing/library';

import { QrScannerService } from './qr-scanner.service';

/**
 * `@zxing/browser` no reexporta `DecodeContinuouslyCallback` desde el root
 * del paquete (solo desde su archivo interno) — se declara el mismo shape
 * localmente para tipar el `callFake` del spy sin depender de una ruta
 * interna del paquete.
 */
type DecodeContinuouslyCallback = (
  result: Result | undefined,
  error: Exception | undefined,
  controls: unknown,
) => void;

describe('QrScannerService', () => {
  let service: QrScannerService;
  let stopSpy: jasmine.Spy;
  let decodeSpy: jasmine.Spy;

  function fakeResult(text: string): Result {
    return { getText: () => text } as unknown as Result;
  }

  beforeEach(() => {
    stopSpy = jasmine.createSpy('stop');
    decodeSpy = spyOn(BrowserQRCodeReader.prototype, 'decodeFromVideoDevice').and.callFake(((
      _deviceId: string | undefined,
      _video: string | HTMLVideoElement | undefined,
      callbackFn: DecodeContinuouslyCallback,
    ) => {
      // Simula un frame decodificado exitosamente para poder verificar
      // que el callback de onDecode se invoca con el texto decodificado.
      callbackFn(fakeResult('unidad-uuid-123'), undefined, { stop: stopSpy });
      return Promise.resolve({ stop: stopSpy });
    }) as never);

    TestBed.configureTestingModule({});
    service = TestBed.inject(QrScannerService);
  });

  it('RF-1.2: inicia el lector sobre el elemento de video y decodifica el texto del QR', async () => {
    const videoElement = document.createElement('video');
    const onDecode = jasmine.createSpy('onDecode');

    await service.start(videoElement, onDecode);

    expect(decodeSpy).toHaveBeenCalledWith(
      undefined,
      videoElement,
      jasmine.any(Function),
    );
    expect(onDecode).toHaveBeenCalledWith('unidad-uuid-123');
  });

  it('no invoca onDecode si el resultado del frame es nulo', async () => {
    decodeSpy.and.callFake(((
      _deviceId: string | undefined,
      _video: string | HTMLVideoElement | undefined,
      callbackFn: DecodeContinuouslyCallback,
    ) => {
      callbackFn(undefined, undefined, { stop: stopSpy });
      return Promise.resolve({ stop: stopSpy });
    }) as never);
    const videoElement = document.createElement('video');
    const onDecode = jasmine.createSpy('onDecode');

    await service.start(videoElement, onDecode);

    expect(onDecode).not.toHaveBeenCalled();
  });

  it('stop() detiene los controles activos del lector', async () => {
    const videoElement = document.createElement('video');
    await service.start(videoElement, () => {});

    service.stop();

    expect(stopSpy).toHaveBeenCalled();
  });

  it('stop() no falla si se llama sin haber iniciado el escaneo', () => {
    expect(() => service.stop()).not.toThrow();
  });

  it('stop() es idempotente: llamarlo dos veces no vuelve a invocar controls.stop()', async () => {
    const videoElement = document.createElement('video');
    await service.start(videoElement, () => {});

    service.stop();
    stopSpy.calls.reset();
    service.stop();

    expect(stopSpy).not.toHaveBeenCalled();
  });
});
