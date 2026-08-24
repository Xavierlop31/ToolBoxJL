import { Injectable } from "@nestjs/common";
import { esRolValido, type UsuarioAutenticado } from "@toolboxjl/shared-types";
import { TokenInvalidoError } from "../domain/errors/token-invalido.error";
import type { SupabaseJwtPayload } from "./supabase-jwt-payload";

/**
 * Traduce un payload de JWT de Supabase Auth (ya verificado en su firma por
 * la infraestructura) a un `UsuarioAutenticado` del dominio.
 *
 * Es la pieza de aplicación que invoca `SupabaseJwtStrategy.validate()` —
 * separada de la estrategia de Passport para poder testear la lógica de
 * extracción/validación de claims sin depender de passport-jwt/jwks-rsa.
 *
 * Falla explícitamente (sin fallback silencioso) si el token no trae un
 * `sub` o un rol de negocio reconocido, tal como pide la Definition of Done:
 * ningún usuario queda autenticado con un rol asumido por defecto.
 */
@Injectable()
export class VerificarAccesoUseCase {
  ejecutar(payload: SupabaseJwtPayload): UsuarioAutenticado {
    if (!payload?.sub || typeof payload.sub !== "string") {
      throw new TokenInvalidoError(
        "El token de Supabase Auth no contiene un `sub` (uid) válido.",
      );
    }

    const rolCrudo = payload.app_metadata?.rol ?? payload.user_metadata?.rol;
    if (!esRolValido(rolCrudo)) {
      throw new TokenInvalidoError(
        `El token no incluye un rol de negocio reconocido en app_metadata.rol ` +
          `(recibido: ${JSON.stringify(rolCrudo)}). Verificá que el Custom Access ` +
          `Token Hook de Supabase esté configurado para poblar ese claim desde ` +
          `public.users.rol (docs/DESIGN.md §3, punto 7).`,
      );
    }

    const email = typeof payload.email === "string" ? payload.email : null;

    return {
      id: payload.sub,
      email,
      rol: rolCrudo,
    };
  }
}
