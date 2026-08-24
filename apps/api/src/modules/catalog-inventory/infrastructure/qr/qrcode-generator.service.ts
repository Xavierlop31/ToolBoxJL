import { Injectable } from "@nestjs/common";
import * as QRCode from "qrcode";
import type { QrCodeGenerator } from "../../domain/qr-code-generator";

/**
 * Implementación real de `QrCodeGenerator` con el paquete `qrcode` (RF-1.2).
 *
 * Decisión provisoria (punto 4 del prompt del Tech Lead, a revisar cuando
 * exista una spec de Supabase Storage real):
 * - El QR se genera on-demand en cada request, no se persiste en base de
 *   datos ni se sube a ningún storage.
 * - Codifica una URL corta con esquema propio `toolboxjl://units/{id}` (en
 *   vez del UUID pelado) para que un lector de QR genérico resuelva a algo
 *   identificable como perteneciente a ToolBox JL; la PWA intercepta ese
 *   esquema para navegar directo a la ficha de la unidad.
 * - Se devuelve como data URI PNG (`data:image/png;base64,...`), listo para
 *   usar directo en un <img src="..."> sin pedir un archivo aparte.
 */
@Injectable()
export class QrCodeGeneratorService implements QrCodeGenerator {
  async generar(unidadId: string): Promise<string> {
    const payload = `toolboxjl://units/${unidadId}`;
    return QRCode.toDataURL(payload, { errorCorrectionLevel: "M" });
  }
}
