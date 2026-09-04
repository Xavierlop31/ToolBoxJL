import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Extrae el claim `sub` de un JWT Bearer SIN verificar su firma.
 *
 * Por qué sin verificar (Issue #187): este guard se registra como `APP_GUARD`
 * global (`app.module.ts`), y Nest ejecuta los guards globales ANTES que los
 * guards de controller/método (`SupabaseAuthGuard`, que sí verifica la firma
 * contra el JWKS de Supabase vía Passport) — ver
 * `docs/06_Esquema_Backend_ToolBoxJL.docx` y el comment de
 * `SupabaseAuthGuard`. Para cuando este guard corre, todavía no hay ninguna
 * verificación de firma hecha sobre el token.
 *
 * Esto es aceptable ACÁ porque el propósito de esta clave es solo particionar
 * el contador de rate-limit (evitar que un usuario logueado comparta cupo con
 * toda su IP, o lo evada rotando de IP) — la barrera de seguridad real
 * (rechazar un token inválido/forjado) la sigue aplicando `SupabaseAuthGuard`
 * más abajo en la cadena, sin excepciones. Un token forjado con un `sub`
 * arbitrario nunca pasa esa verificación, así que como mucho un atacante
 * logra que su tráfico anónimo se particione por un `sub` inventado en vez
 * de por IP — no gana acceso a ningún recurso protegido, y en endpoints
 * públicos particionar por un valor inventado no es peor que particionar por
 * una IP rotada (ambos evadibles con suficiente esfuerzo; ninguno es la
 * defensa contra fuerza bruta en `auth-otp`, que depende de que el atacante
 * ya tenga una sesión real autenticada).
 */
function extraerSubDeJwtSinVerificar(
  authorizationHeader: unknown,
): string | null {
  if (
    typeof authorizationHeader !== "string" ||
    !authorizationHeader.startsWith("Bearer ")
  ) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  const partes = token.split(".");
  if (partes.length !== 3) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(partes[1], "base64url").toString("utf8");
    const payload: unknown = JSON.parse(payloadJson);
    const sub =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>).sub
        : undefined;
    return typeof sub === "string" && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

/**
 * `ThrottlerGuard` con tracker combinado (Issue #187): partición por usuario
 * autenticado (`sub` del JWT) cuando el request trae un Bearer token, IP en
 * caso contrario. Se registra como `APP_GUARD` global en `app.module.ts`.
 */
@Injectable()
export class UsuarioOIpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const sub = extraerSubDeJwtSinVerificar(req.headers?.authorization);
    if (sub) {
      return `user:${sub}`;
    }
    const ip = req.ip ?? req.socket?.remoteAddress ?? "desconocida";
    return `ip:${ip}`;
  }
}
