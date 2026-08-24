import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";

/**
 * Param decorator para inyectar el `UsuarioAutenticado` (adjuntado a
 * `request.user` por `SupabaseAuthGuard`/Passport) directo en un handler:
 *
 *   @Get("orders")
 *   misOrdenes(@UsuarioActual() usuario: UsuarioAutenticado) { ... }
 */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const request = contexto.switchToHttp().getRequest();
    return request.user;
  },
);
