import { Injectable } from "@nestjs/common";
import { esRolValido, type UsuarioAutenticado } from "@toolboxjl/shared-types";
import { CuentaDesactivadaError } from "../domain/errors/cuenta-desactivada.error";
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
 *
 * `telefono` (Sprint 6, HU-6.2 — AuthOtpModule) NO sigue ese mismo criterio
 * estricto: si el claim no está, `UsuarioAutenticado.telefono` queda
 * `null` en vez de fallar — a diferencia del rol, la enorme mayoría de
 * endpoints de la plataforma no lo necesitan, así que exigirlo acá
 * rechazaría el login de cualquier usuario para CUALQUIER endpoint. Solo
 * `SolicitarOtpUseCase` (AuthOtpModule) lo necesita, y ahí sí falla
 * explícito si falta (`TelefonoNoDisponibleError`, ver ese módulo para el
 * detalle de la asunción sobre en qué claim del JWT viaja el teléfono).
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

    // Épica 16: `false` explícito rechaza el acceso — ausente (JWT emitido
    // antes de que existiera este claim) o `true` deja pasar. A diferencia
    // del rol, NO se exige que el claim esté presente (ver doc-comment de
    // `SupabaseJwtPayload.app_metadata.activo`).
    const activoCrudo = payload.app_metadata?.activo ?? payload.user_metadata?.activo;
    if (activoCrudo === false) {
      throw new CuentaDesactivadaError();
    }

    const email = typeof payload.email === "string" ? payload.email : null;

    const telefonoCrudo = payload.app_metadata?.telefono ?? payload.user_metadata?.telefono;
    const telefono = typeof telefonoCrudo === "string" ? telefonoCrudo : null;

    return {
      id: payload.sub,
      email,
      rol: rolCrudo,
      telefono,
    };
  }
}
