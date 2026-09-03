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
import { ZonesModule } from "./modules/zones/interface/zones.module";

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
 * Sprint 12: + ZonesModule (Épica 12, HU-12.2 — zonas logísticas por ciudad
 * para el selector dinámico de la ficha técnica del catálogo, GET /zones
 * público). Además, en este sprint: paginación de GET /catalog/search,
 * GET /orders ("Mis Pedidos Activos") y ToolModel.precio_venta (cambios en
 * los módulos existentes CatalogInventoryModule/OrdersModule, sin módulo
 * nuevo propio para esos dos).
 * Sprint 14 (Fase 3, Épica 13, Issues #147-#150 / HU-13.1 a 13.4): panel
 * administrativo de Gestión de Inventario QR (`apps/panel-admin`) —
 * `GET /inventory/units`/`GET /inventory/metrics`/`GET /inventory/maintenance`
 * y campos nuevos de `POST /inventory/units`/`PATCH
 * /inventory/units/{id}/status` (cambios en CatalogInventoryModule, sin
 * módulo nuevo propio) + `GET /logistics/routes-today` (LogisticsModule,
 * que a partir de este sprint importa además CatalogInventoryModule y el
 * nuevo `UsersModule` — primer módulo que lee `public.users` desde código
 * Node, ver `users/domain/user.repository.ts`). `UsersModule` no se lista
 * acá como import directo de `AppModule` porque no expone controller propio
 * — solo lo consume `LogisticsModule` internamente.
 * Sprint 15 (Issue #153 / HU-15.1, Épica 15): `GET /analytics/dashboard-kpis`
 * (dashboard ejecutivo consolidado + panel de Alertas Críticas) — cambio en
 * AnalyticsModule existente, que a partir de este sprint también importa
 * CatalogInventoryModule/OrdersModule/UsersModule (mismo criterio que
 * LogisticsModule en Sprint 14); sin módulo nuevo propio ni cambio acá.
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
    ZonesModule,
  ],
})
export class AppModule {}
