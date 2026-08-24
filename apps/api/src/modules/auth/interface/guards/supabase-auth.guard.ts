import { Injectable, type ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

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
}
