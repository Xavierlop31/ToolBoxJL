import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/interface/auth.module";
import { validarEnvDeAuth } from "./modules/auth/infrastructure/config/supabase-auth.config";
import { CatalogInventoryModule } from "./modules/catalog-inventory/interface/catalog-inventory.module";
import { OrdersModule } from "./modules/orders/interface/orders.module";
import { PaymentsModule } from "./modules/payments/interface/payments.module";

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
  ],
})
export class AppModule {}
