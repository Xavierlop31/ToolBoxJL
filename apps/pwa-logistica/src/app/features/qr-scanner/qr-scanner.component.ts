import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { QrScannerService } from '../../core/scanner/qr-scanner.service';

/**
 * Escaneo de QR — RF-1.2: "el QR es escaneable desde la PWA"
 * (features/01_catalogo_inventario.feature). El QR físico codifica
 * directamente el UUID de la unidad (docs/DESIGN.md §4.1: "TOOL_UNITS { uuid
 * id PK 'also encoded in the physical QR' }"), por lo que decodificar el QR
 * y navegar a `/unidades/:id` dispara `GET /inventory/units/{id}`.
 *
 * Seam de testing: si `window.__E2E_QR_MOCK__` está definido, se usa ese
 * valor como resultado decodificado en vez de acceder a la cámara real —
 * per instrucción del Tech Lead de mockear la fuente de video/resultado del
 * scanner en los tests BDD (no depender de una cámara real en CI). Es un
 * global de solo lectura que nunca se setea en producción, así que no
 * afecta el comportamiento real de usuarios.
 */
@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  templateUrl: './qr-scanner.component.html',
  styleUrl: './qr-scanner.component.scss',
})
export class QrScannerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  private readonly scanner = inject(QrScannerService);
  private readonly router = inject(Router);

  readonly scanning = signal(true);
  readonly error = signal<string | null>(null);

  ngAfterViewInit(): void {
    const mockResult = (window as unknown as { __E2E_QR_MOCK__?: string })
      .__E2E_QR_MOCK__;

    if (mockResult) {
      this.handleDecoded(mockResult);
      return;
    }

    if (!this.videoRef) {
      return;
    }

    this.scanner
      .start(this.videoRef.nativeElement, (text) => this.handleDecoded(text))
      .catch((err: unknown) => {
        this.error.set(
          'No se pudo acceder a la cámara. Revisá los permisos e intentá de nuevo. ' +
            String(err),
        );
      });
  }

  private handleDecoded(unitId: string): void {
    this.scanning.set(false);
    void this.router.navigate(['/unidades', unitId]);
  }

  ngOnDestroy(): void {
    this.scanner.stop();
  }
}
