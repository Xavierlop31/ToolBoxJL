import {
  Injectable,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { TokenInvalidoError } from "../../domain/errors/token-invalido.error";

/**
 * Guard de autenticación: exige un Bearer token válido de Supabase Auth
 * (verificado por `SupabaseJwtStrategy`) salvo que el handler/controller
 * esté marcado con `@Public()`.
 */
@Injectable()
export class SupabaseAuthGuard extends AuthGuard("supabase-jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const esPublico = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (esPublico) {
      return true;
    }
    return super.canActivate(context);
  }

  /**
   * Sin este override, un TokenInvalidoError lanzado por
   * SupabaseJwtStrategy.validate() escapa como excepción no controlada por
   * Passport y Nest lo traduce en 500 en vez de 401 — acá se restablece la
   * semántica esperada por el cliente sin alterar ningún otro caso de error.
   */
  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err instanceof TokenInvalidoError) {
      throw new UnauthorizedException(err.message);
    }
    return super.handleRequest(err, user, info, context);
  }
}
