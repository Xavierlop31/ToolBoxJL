import { Controller, ForbiddenException, Get, Header, HttpCode, Logger, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { Public } from "../../auth/interface/decorators/public.decorator";
import { loadWebhookVerifyToken } from "../infrastructure/config/whatsapp-webhook.config";
import { WhatsAppSignatureGuard } from "./guards/whatsapp-signature.guard";
import { extraerMensajesEntrantes, type WebhookInboundMessage } from "../domain/webhook-message";
import {
  procesarMensajeEntrante,
  type AnthropicMessagesClient,
  type ProcesarMensajeEntranteDeps,
} from "../application/procesar-mensaje-entrante.use-case";
import {
  loadAgente2ApiBaseUrl,
  loadAgente2ServiceCredentials,
  loadAnthropicConfig,
  loadPortalBaseUrl,
  loadSupabaseRestConfig,
} from "../infrastructure/agente-2/config";
import { SupabaseAgente2AuthGatewayService } from "../infrastructure/agente-2/auth-gateway";
import { DeepgramSpeechToTextService } from "../infrastructure/deepgram/deepgram-speech-to-text.service";
import { ElevenLabsTextToSpeechService } from "../infrastructure/elevenlabs/elevenlabs-text-to-speech.service";
import { WhatsAppMediaService } from "../infrastructure/whatsapp/whatsapp-media.service";

/**
 * `/webhooks/whatsapp` (openapi.yaml, tag "Agente 2 — WhatsApp",
 * `security: []`, `x-roles: [público]`) — llamado por Meta, no por un
 * cliente de la plataforma. Ver el guard (`WhatsAppSignatureGuard`) para la
 * autenticación real (firma HMAC, no Bearer JWT).
 *
 * *** Idempotencia NO implementada en este sprint (gap documentado) ***:
 * Meta puede reintentar la entrega de un mismo evento (`waMessageId`) si
 * este endpoint no responde 200 a tiempo; este sprint no deduplica por
 * `waMessageId` antes de reprocesar — en el peor caso, un reintento de Meta
 * dispara una segunda pasada de STT/Claude/TTS para el mismo mensaje
 * (costo duplicado, no un error de negocio: `extend_rental` no es
 * idempotente tampoco, así que un reintento MUY tardío en teoría podría
 * intentar extender dos veces — de nuevo, aceptado por plazo, no ignorado).
 */
@Controller("webhooks/whatsapp")
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  @Public()
  @Get()
  @Header("Content-Type", "text/plain")
  verificar(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") verifyToken: string,
    @Query("hub.challenge") challenge: string,
  ): string {
    const tokenEsperado = loadWebhookVerifyToken();
    if (mode !== "subscribe" || verifyToken !== tokenEsperado) {
      throw new ForbiddenException("hub.verify_token no coincide con WHATSAPP_WEBHOOK_VERIFY_TOKEN.");
    }
    return challenge;
  }

  @Public()
  @UseGuards(WhatsAppSignatureGuard)
  @Post()
  @HttpCode(200)
  recibir(@Req() request: Request): void {
    const mensajes = extraerMensajesEntrantes(request.body);
    if (mensajes.length === 0) {
      return;
    }

    // Responder 200 de inmediato (ya pasó — Nest manda la respuesta al
    // retornar este método) y procesar de forma asíncrona, fire-and-forget:
    // Meta espera <5s (openapi.yaml) y el pipeline STT→Claude→TTS puede
    // tardar más que eso. Sin sistema de colas nuevo (decisión de alcance
    // documentada en el prompt del sprint) — si el proceso de apps/api se
    // reinicia entre el ack y este `.catch`, el mensaje se pierde; aceptado
    // por plazo, documentado, no ignorado.
    for (const mensaje of mensajes) {
      this.procesarEnSegundoPlano(mensaje).catch((error) => {
        this.logger.error(
          `Falló el procesamiento asíncrono del mensaje ${mensaje.waMessageId} de ${mensaje.telefono}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }
  }

  private async procesarEnSegundoPlano(mensaje: WebhookInboundMessage): Promise<void> {
    const deps = this.armarDependenciasAgente2();
    await procesarMensajeEntrante(deps, mensaje);
  }

  /**
   * Wiring manual (no DI de Nest) de las dependencias reales del Agente 2 —
   * mismo criterio que `apps/workers/src/route-scheduler-job.ts`: se arma
   * una vez por mensaje procesado (el costo de instanciar estos clientes es
   * despreciable frente al de las llamadas de red que hacen). Se resuelve
   * acá y no vía constructor injection del controller para que
   * `procesarMensajeEntrante` (la función pura/testeable) sea la única
   * pieza que los tests ejercitan — este método nunca corre en tests
   * unitarios.
   */
  private armarDependenciasAgente2(): ProcesarMensajeEntranteDeps {
    const anthropicConfig = loadAnthropicConfig();
    const anthropicClient = new Anthropic({ apiKey: anthropicConfig.apiKey });
    const anthropic: AnthropicMessagesClient = {
      create: (params) => anthropicClient.messages.create(params),
    };

    return {
      anthropic,
      model: anthropicConfig.model,
      apiBaseUrl: loadAgente2ApiBaseUrl(),
      portalBaseUrl: loadPortalBaseUrl(),
      authGateway: new SupabaseAgente2AuthGatewayService(
        loadAgente2ServiceCredentials(),
        loadSupabaseRestConfig(),
      ),
      speechToText: new DeepgramSpeechToTextService(),
      textToSpeech: new ElevenLabsTextToSpeechService(),
      whatsapp: new WhatsAppMediaService(),
    };
  }
}
