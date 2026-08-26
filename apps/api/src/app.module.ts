import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/interface/auth.module";
import { validarEnvDeAuth } from "./modules/auth/infrastructure/config/supabase-auth.config";
import { CatalogInventoryModule } from "./modules/catalog-inventory/interface/catalog-inventory.module";
import { OrdersModule } from "./modules/orders/interface/orders.module";
import { PaymentsModule } from "./modules/payments/interface/payments.module";
import { FleetModule } from "./modules/fleet/interface/fleet.module";
import { LogisticsModule } from "./modules/logistics/interface/logistics.module";
import { InspectionsModule } from "./modules/inspections/interface/inspections.module";
import { AuthOtpModule } from "./modules/auth-otp/interface/auth-otp.module";
import { AnalyticsModule } from "./modules/analytics/interface/analytics.module";
import { WhatsAppWebhookModule } from "./modules/whatsapp-webhook/interface/whatsapp-webhook.module";
import { CartModule } from "./modules/cart/interface/cart.module";
import { VoiceAgentModule } from "./modules/voice-agent/interface/voice-agent.module";

/**
 * AppModule raíz. `ConfigModule.forRoot` con `validate` hace que la app
 * falle al arrancar (con un mensaje explícito) si `SUPABASE_URL` no está
 * definida, en vez de levantar en un estado donde el AuthModule no pueda
 * verificar ningún token — ver apps/api/.env.example.
 *
 * `DATABASE_URL` (requerida por CatalogInventoryModule/PrismaService) se
 * valida por separado, al instanciar `PrismaService` (ver
 * infrastructure/config/database.config.ts) — no se agregó acá a propósito,
 * para no acoplar la validación de dos módulos de dominio distintos en un
 * único `validate` de ConfigModule; cada módulo falla explícito con su
 * propia variable cuando efectivamente la necesita.
 *
 * Sprint 0: AuthModule (Issue #17 / HU-6.1).
 * Sprint 1: + CatalogInventoryModule (Issues #1-#4 / HU-1.1 a 1.4,
 * docs/DESIGN.md §3).
 * Sprint 2: + OrdersModule (HU-2.1/2.2 — cotización y creación de órdenes).
 * Sprint 3: + PaymentsModule (HU-2.2/2.3/2.4 — pagos y depósito de
 * garantía, RF-2.2 a RF-2.4).
 * Sprint 4: + FleetModule/LogisticsModule (Issues #11-#13 / HU-4.1 a 4.3 —
 * flota, asignación de rutas y seguimiento de envíos en tiempo real,
 * RF-3.1 a RF-3.3).
 * Sprint 5: + InspectionModule (Issues #14-#16 / HU-5.1 a 5.3 — checklist de
 * inspección con ejecución de garantía, modalidad de devolución y
 * facturación automática de mora, RF-4.1 a RF-4.3).
 * Sprint 6: + AuthOtpModule (Issue #18 / HU-6.2 — verificación OTP por
 * WhatsApp en dispositivo nuevo) + AnalyticsModule (Issue #19 / HU-7.1 —
 * ingresos totales desglosados, Fase 1 de Analítica). Ambos entregables de
 * Sprint 6, implementados en PRs separados.
 * Sprint 8: + WhatsAppWebhookModule (Issues #24/#25 / HU-9.1/9.2 — Agente 2:
 * webhook entrante de WhatsApp Cloud API + orquestación de tool calling con
 * Claude, ver ese módulo para el detalle de la decisión de arquitectura).
 * Sprint 9: + CartModule (carrito de compras, GET /cart, POST
 * /cart/add-item) + VoiceAgentModule (POST /voice-agent/livekit-token —
 * emisión de tokens de sala LiveKit para el Agente 3, Conserje de Voz).
 * Issues #26/#27 / HU-10.1/10.2. Ver cart/interface/cart.module.ts y
 * voice-agent/application/emitir-token-livekit.use-case.ts para la decisión
 * de arquitectura clave de este sprint (el Agente 3 no tiene cuenta de
 * servicio propia).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validarEnvDeAuth,
    }),
    AuthModule,
    CatalogInventoryModule,
    OrdersModule,
    PaymentsModule,
    FleetModule,
    LogisticsModule,
    InspectionsModule,
    AuthOtpModule,
    AnalyticsModule,
    WhatsAppWebhookModule,
    CartModule,
    VoiceAgentModule,
  ],
})
export class AppModule {}
