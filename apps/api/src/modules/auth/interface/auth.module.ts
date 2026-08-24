import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { VerificarAccesoUseCase } from "../application/verificar-acceso.use-case";
import { SUPABASE_AUTH_CONFIG } from "../infrastructure/auth-infrastructure.tokens";
import { loadSupabaseAuthConfig } from "../infrastructure/config/supabase-auth.config";
import { SupabaseJwtStrategy } from "../infrastructure/strategies/supabase-jwt.strategy";
import { RolesGuard } from "./guards/roles.guard";
import { SupabaseAuthGuard } from "./guards/supabase-auth.guard";

/**
 * AuthModule (docs/DESIGN.md §3, punto 7): verifica JWTs de Supabase Auth y
 * expone el guard de RBAC reutilizable sobre los 5 roles de negocio.
 *
 * Sprint 0 (Issue #17 / HU-6.1): solo cubre el primer escenario de
 * features/06_autenticacion_seguridad.feature (login con correo/contraseña
 * o Google contra Supabase Auth — el login en sí lo resuelve el frontend
 * directo contra Supabase; este módulo solo verifica el JWT resultante y
 * aplica RBAC). El segundo escenario (OTP por WhatsApp) es Sprint 6 y no
 * está cubierto acá.
 *
 * No expone ningún controller: los guards/decoradores quedan listos para
 * que los módulos de dominio (CatalogModule, PricingModule, ...) los usen
 * a partir de Sprint 1, cuando existan endpoints reales que proteger.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: "supabase-jwt" })],
  providers: [
    {
      provide: SUPABASE_AUTH_CONFIG,
      useFactory: () => loadSupabaseAuthConfig(),
    },
    VerificarAccesoUseCase,
    SupabaseJwtStrategy,
    SupabaseAuthGuard,
    RolesGuard,
  ],
  exports: [PassportModule, SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}
