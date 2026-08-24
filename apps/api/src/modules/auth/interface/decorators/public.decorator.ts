import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marca un handler/controller como público (sin JWT requerido) — refleja
 * los endpoints con `security: []` en openapi.yaml (ej. GET /catalog/search).
 * `SupabaseAuthGuard` lo respeta antes de exigir un Bearer token.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
