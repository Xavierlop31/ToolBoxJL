import { Injectable } from '@angular/core';
import { BrowserQRCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';

/**
 * Envuelve `@zxing/browser` (`BrowserQRCodeReader`, sobre `getUserMedia`)
 * para el escaneo de QR de unidades físicas — RF-1.2 ("el QR es escaneable
 * desde la PWA").
 *
 * Elección de librería: `@zxing/browser` (ZXing, puerto TS/JS del decoder
 * Java de Google) en vez de una librería nativa `BarcodeDetector` porque
 * `BarcodeDetector` todavía no tiene soporte universal en navegadores
 * (Firefox/Safari no lo implementan de forma estable a la fecha de este
 * sprint) — ZXing corre en JS puro sobre cualquier navegador con
 * `getUserMedia`, que es el requisito real de la PWA offline-first.
 */
@Injectable({ providedIn: 'root' })
export class QrScannerService {
  private readonly reader = new BrowserQRCodeReader();
  private controls: IScannerControls | null = null;

  async start(
    videoElement: HTMLVideoElement,
    onDecode: (text: string) => void,
  ): Promise<void> {
    this.controls = await this.reader.decodeFromVideoDevice(
      undefined,
      videoElement,
      (result) => {
        if (result) {
          onDecode(result.getText());
        }
      },
    );
  }

  stop(): void {
    this.controls?.stop();
    this.controls = null;
  }
}
