import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { passportJwtSecret } from "jwks-rsa";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import type { SupabaseJwtPayload } from "../../application/supabase-jwt-payload";
import { VerificarAccesoUseCase } from "../../application/verificar-acceso.use-case";
import { SUPABASE_AUTH_CONFIG } from "../auth-infrastructure.tokens";
import type { SupabaseAuthConfig } from "../config/supabase-auth.config";

/**
 * Estrategia de Passport que verifica JWTs de Supabase Auth (Bearer token)
 * contra el JWKS público del proyecto y delega en `VerificarAccesoUseCase`
 * la extracción del `UsuarioAutenticado` (id/email/rol) a partir del
 * payload ya verificado.
 *
 * `jwks-rsa`'s `passportJwtSecret` cachea las claves y aplica rate-limit a
 * las requests al endpoint JWKS — no se resuelve una clave nueva por cada
 * request entrante.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  "supabase-jwt",
) {
  constructor(
    @Inject(SUPABASE_AUTH_CONFIG) config: SupabaseAuthConfig,
    private readonly verificarAcceso: VerificarAccesoUseCase,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: config.audience,
      issuer: config.issuer,
      algorithms: ["ES256", "RS256"],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: config.jwksUri,
      }),
    });
  }

  /**
   * Passport ya validó firma/expiración/issuer/audience antes de llegar
   * acá — lo único que queda es traducir el payload a un usuario de
   * dominio, lo que puede seguir fallando (ej. rol de negocio ausente).
   */
  validate(payload: SupabaseJwtPayload): UsuarioAutenticado {
    return this.verificarAcceso.ejecutar(payload);
  }
}
