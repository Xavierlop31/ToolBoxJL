import { Injectable, Logger, UnauthorizedException, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { loadWhatsAppAppSecret } from "../../infrastructure/config/whatsapp-webhook.config";
import { verificarFirmaWhatsApp } from "../../infrastructure/signature/hmac-verifier";

/**
 * Autenticación de `POST /webhooks/whatsapp` (openapi.yaml: `security: []`,
 * NO es un Bearer JWT — Meta firma el body con `X-Hub-Signature-256` usando
 * `WHATSAPP_APP_SECRET`, ver esa descripción). Corre en vez de
 * `SupabaseAuthGuard` para este controller.
 *
 * *** Si `WHATSAPP_APP_SECRET` no está definida, este guard rechaza TODOS
 * los requests con 401 *** — nunca "abre" el endpoint para destrabar
 * desarrollo local sin la credencial (instrucción explícita del Tech Lead,
 * ver CLAUDE.md §7 punto 5: un bloqueo real se reporta, no se resuelve
 * saltando la verificación de seguridad). El log deja explícito que el
 * motivo del 401 es "credencial faltante" y no "firma inválida", para que
 * quien lea los logs de producción entienda que es un bloqueo de
 * configuración, no un intento de ataque.
 *
 * Requiere `req.rawBody` (Buffer) — habilitado en `main.ts` con
 * `NestFactory.create(AppModule, { rawBody: true })`. La firma se calcula
 * sobre los bytes EXACTOS del body, no sobre un `JSON.stringify` del body ya
 * parseado (ver `hmac-verifier.ts`).
 */
@Injectable()
export class WhatsAppSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WhatsAppSignatureGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();

    const appSecret = loadWhatsAppAppSecret();
    if (!appSecret) {
      this.logger.warn(
        "POST /webhooks/whatsapp rechazado: WHATSAPP_APP_SECRET no está configurada en este entorno " +
          "— bloqueo real documentado (ver apps/api/.env.example), no un intento de ataque. Sin esta " +
          "credencial, NUNCA se procesa un webhook (no hay modo de desarrollo sin firma).",
      );
      throw new UnauthorizedException("Webhook no configurado: falta WHATSAPP_APP_SECRET.");
    }

    const rawBody = request.rawBody;
    const headerSignature = request.headers["x-hub-signature-256"];
    const firmaValida =
      rawBody &&
      typeof headerSignature === "string" &&
      verificarFirmaWhatsApp(rawBody, headerSignature, appSecret);

    if (!firmaValida) {
      this.logger.warn("POST /webhooks/whatsapp rechazado: X-Hub-Signature-256 ausente o inválida.");
      throw new UnauthorizedException("Firma X-Hub-Signature-256 ausente o inválida.");
    }

    return true;
  }
}
