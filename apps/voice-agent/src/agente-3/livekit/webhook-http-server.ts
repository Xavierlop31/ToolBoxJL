import * as http from "node:http";
import { WebhookReceiver } from "livekit-server-sdk";
import type { LiveKitConfig } from "../config";
import { decidirSiUnirseASala } from "./webhook-event-router";

/**
 * Servidor HTTP mínimo (sin Express — `node:http` nativo, mismo criterio de
 * "sin dependencias extra si no hace falta" que el resto del repo) que
 * recibe los webhooks de LiveKit (`room_started`/`participant_joined`/etc,
 * TRD §4.3 — "tokens de sala de corta duración emitidos por el backend...
 * SDK de LiveKit Agents (server)"). Es la señal de "sala nueva" que dispara
 * que el proceso persistente del Agente 3 se una — ver comentario de
 * cabecera de `../../main.ts` y `config.ts` (`loadPort`) para el porqué de
 * exponer un puerto HTTP en un servicio que, por lo demás, es un proceso de
 * fondo.
 *
 * *** Requiere configuración de infraestructura FUERA de este sprint de IA
 * ***: el proyecto LiveKit necesita tener configurada la URL pública de este
 * endpoint (`https://<host-de-este-servicio>/livekit/webhook`) como webhook
 * URL — LiveKit Cloud / LiveKit self-hosted lo configuran en el dashboard
 * del proyecto o en `livekit.yaml`, respectivamente. No hay forma de
 * probarlo de punta a punta sin esa configuración real (documentado, ver
 * `.github/workflows/agente-3-voz-integration.yml`).
 *
 * `unirseASala` es inyectable a propósito — permite testear el ROUTING
 * (verificación de firma + `decidirSiUnirseASala`) sin depender de
 * `room-session.ts` (que sí necesita LiveKit real).
 */
export interface WebhookHttpServerDeps {
  liveKitConfig: LiveKitConfig;
  unirseASala: (roomName: string) => Promise<void> | void;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export function crearServidorWebhook(deps: WebhookHttpServerDeps): http.Server {
  const logger = deps.logger ?? console;
  const receiver = new WebhookReceiver(deps.liveKitConfig.apiKey, deps.liveKitConfig.apiSecret);

  return http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/livekit/webhook") {
      res.writeHead(404).end();
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      void (async () => {
        try {
          const body = Buffer.concat(chunks).toString("utf-8");
          const authHeader = req.headers.authorize as string | undefined;
          const evento = await receiver.receive(body, authHeader);

          const decision = decidirSiUnirseASala({
            event: evento.event,
            room: evento.room ? { name: evento.room.name } : undefined,
            participant: evento.participant ? { identity: evento.participant.identity } : undefined,
          });
          logger.log(`[Agente 3][webhook] ${decision.motivo}`);

          if (decision.debeUnirse && decision.roomName) {
            await deps.unirseASala(decision.roomName);
          }

          res.writeHead(200).end();
        } catch (error) {
          logger.error("[Agente 3][webhook] Error procesando el webhook de LiveKit:", error);
          // 401 si es un fallo de verificación de firma, 500 en cualquier
          // otro caso — WebhookReceiver.receive() no distingue el tipo de
          // error en su forma pública, así que se responde 400 genérico
          // (LiveKit reintenta webhooks fallidos, así que un código de error
          // es preferible a un 200 silencioso que oculte el problema).
          res.writeHead(400).end();
        }
      })();
    });
  });
}
