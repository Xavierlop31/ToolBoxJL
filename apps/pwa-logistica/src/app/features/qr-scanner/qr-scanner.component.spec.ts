import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { QrScannerComponent } from './qr-scanner.component';
import { QrScannerService } from '../../core/scanner/qr-scanner.service';

describe('QrScannerComponent', () => {
  let fixture: ComponentFixture<QrScannerComponent>;
  let component: QrScannerComponent;
  let scannerSpy: jasmine.SpyObj<QrScannerService>;
  let router: Router;

  beforeEach(() => {
    scannerSpy = jasmine.createSpyObj('QrScannerService', ['start', 'stop']);
    scannerSpy.start.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [QrScannerComponent],
      providers: [provideRouter([]), { provide: QrScannerService, useValue: scannerSpy }],
    });

    fixture = TestBed.createComponent(QrScannerComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    delete (window as unknown as { __E2E_QR_MOCK__?: string }).__E2E_QR_MOCK__;
  });

  it('RF-1.2: si hay un mock E2E, navega directo sin acceder a la cámara real', async () => {
    (window as unknown as { __E2E_QR_MOCK__?: string }).__E2E_QR_MOCK__ = 'unidad-mock-1';
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(scannerSpy.start).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/unidades', 'unidad-mock-1']);
    expect(component.scanning()).toBe(false);
  });

  it('RF-1.2: inicia el scanner real sobre el elemento de video cuando no hay mock', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(scannerSpy.start).toHaveBeenCalledWith(
      jasmine.any(HTMLVideoElement),
      jasmine.any(Function),
    );
  });

  it('al decodificar un QR real, navega a la ficha de la unidad y detiene el escaneo', async () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.detectChanges();
    await fixture.whenStable();

    const onDecode = scannerSpy.start.calls.mostRecent().args[1] as (text: string) => void;
    onDecode('unidad-real-42');

    expect(navigateSpy).toHaveBeenCalledWith(['/unidades', 'unidad-real-42']);
    expect(component.scanning()).toBe(false);
  });

  it('setea un mensaje de error si no se puede acceder a la cámara', async () => {
    scannerSpy.start.and.rejectWith(new Error('NotAllowedError'));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.error()).toContain('No se pudo acceder a la cámara');
    expect(component.error()).toContain('NotAllowedError');
  });

  it('ngOnDestroy detiene el escaneo activo', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.ngOnDestroy();

    expect(scannerSpy.stop).toHaveBeenCalled();
  });
});
