import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/interface/auth.module";
import { validarEnvDeAuth } from "./modules/auth/infrastructure/config/supabase-auth.config";

/**
 * AppModule raíz. `ConfigModule.forRoot` con `validate` hace que la app
 * falle al arrancar (con un mensaje explícito) si `SUPABASE_URL` no está
 * definida, en vez de levantar en un estado donde el AuthModule no pueda
 * verificar ningún token — ver apps/api/.env.example.
 *
 * Sprint 0: solo AuthModule (Issue #17 / HU-6.1). Los demás módulos de
 * dominio (CatalogModule, PricingModule, ...) se suman a partir de Sprint 1
 * según docs/DESIGN.md §3.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validarEnvDeAuth,
    }),
    AuthModule,
  ],
})
export class AppModule {}
