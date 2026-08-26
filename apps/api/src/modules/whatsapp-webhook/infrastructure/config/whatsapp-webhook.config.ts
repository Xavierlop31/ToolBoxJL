/**
 * Config del webhook de WhatsApp (Sprint 8, Issue #24/#25, HU-9.1/9.2). Dos
 * credenciales DISTINTAS de las de AuthOtpModule (`whatsapp.config.ts`),
 * aunque comparten la misma WABA:
 *
 * - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: string arbitrario que VOS elegís al
 *   configurar la suscripción del webhook en el panel de WhatsApp Business —
 *   Meta te lo devuelve tal cual en `hub.verify_token` durante el handshake
 *   GET. Según el prompt del Tech Lead, YA EXISTE como secret.
 * - `WHATSAPP_APP_SECRET`: el "App Secret" de la app de Meta for Developers
 *   asociada a la WABA (Configuración básica de la app) — se usa para
 *   verificar la firma HMAC-SHA256 (`X-Hub-Signature-256`) de cada POST.
 *   *** Es probable que ESTA todavía NO exista *** (instrucción explícita
 *   del Tech Lead) — a diferencia del resto de las credenciales de este
 *   sprint, acá NO hay fallback: si falta, `WhatsAppSignatureGuard` rechaza
 *   con 401 CUALQUIER webhook entrante (nunca procesa sin firma válida, ni
 *   siquiera para destrabar desarrollo local) — ver ese guard para el
 *   detalle. Este loader se llama de forma lazy (por request, no al bootear
 *   la app) precisamente para que la ausencia de esta credencial no tumbe
 *   toda la API — solo bloquea este endpoint puntual.
 */
export function loadWebhookVerifyToken(env: NodeJS.ProcessEnv = process.env): string {
  const token = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN no está definida. GET /webhooks/whatsapp (handshake de Meta) " +
        "no puede validar hub.verify_token sin ella. Definila en el entorno — ver apps/api/.env.example.",
    );
  }
  return token;
}

export function loadWhatsAppAppSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.WHATSAPP_APP_SECRET?.trim() || null;
}
