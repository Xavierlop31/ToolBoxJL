import { Module } from "@nestjs/common";
import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";
import { WhatsAppSignatureGuard } from "./guards/whatsapp-signature.guard";

/**
 * WhatsAppWebhookModule (Sprint 8, Issues #24/#25 — HU-9.1/9.2). Sin
 * `AuthModule` en `imports`: este controller NUNCA usa `SupabaseAuthGuard`
 * (Meta no manda Bearer JWT, ver `WhatsAppSignatureGuard`).
 *
 * Las dependencias reales del Agente 2 (Anthropic/Deepgram/ElevenLabs/
 * WhatsApp Cloud API/Supabase Auth del usuario de servicio) se instancian a
 * mano dentro del controller (`armarDependenciasAgente2`), no vía provider
 * de Nest — mismo criterio que `apps/workers/src/route-scheduler-job.ts`:
 * son credenciales que pueden faltar en este entorno (ver `.env.example`) y
 * NO deben tumbar el bootstrap de toda la API si faltan; solo deben fallar
 * cuando efectivamente se recibe un mensaje a procesar.
 */
@Module({
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppSignatureGuard],
})
export class WhatsAppWebhookModule {}
