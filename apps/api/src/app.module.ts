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
  ],
})
export class AppModule {}
