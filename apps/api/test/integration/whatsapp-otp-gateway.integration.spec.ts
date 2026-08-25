/**
 * Test de integración REAL contra WhatsApp Cloud API — Issue #18 (HU-6.2).
 *
 * A diferencia del resto de la suite (`jest.config.js`, `InMemoryWhatsAppOtpGateway`
 * en BDD/unit tests), este archivo llama de verdad a
 * `https://graph.facebook.com` usando `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`
 * reales. NUNCA corre como parte de `pnpm test` (ver jest.integration.config.js) —
 * se invoca explícito con `pnpm --filter @toolboxjl/api run
 * test:integration:whatsapp`, en un job de CI aparte
 * (`.github/workflows/whatsapp-otp-integration.yml`) que provee los secrets
 * reales vía `env:` (nunca interpolados en el `run:` — hardening de Sonar).
 *
 * Localmente, sin esas variables definidas, TODO este archivo queda en
 * skip (`describe.skip`) — no rompe `pnpm test` para nadie que no tenga las
 * credenciales.
 *
 * Dos pruebas, dos alcances distintos (documentado, no una elección
 * arbitraria):
 *
 * 1. "las credenciales autentican contra la Graph API real" — SIEMPRE corre
 *    si `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` están definidas (que es
 *    el caso en el job de CI dedicado). Llama a
 *    `GET /{PHONE_NUMBER_ID}` (metadata del número, de solo lectura) —
 *    prueba que las credenciales son válidas y reales SIN necesitar ningún
 *    número de teléfono destinatario.
 *
 * 2. "enviarOtp() manda un mensaje real end-to-end" — ejercita
 *    `WhatsAppOtpGatewayService.enviarOtp` de verdad (`POST /messages`),
 *    que SÍ necesita un destinatario real. Esa prueba queda en skip con un
 *    mensaje explícito si no está definida `WHATSAPP_TEST_RECIPIENT_PHONE`
 *    — instrucción explícita del Tech Lead: no inventar un número de
 *    prueba. Si el Tech Lead/Arquitecto proveen un número de prueba real
 *    (secret nuevo), esta prueba se activa sola sin tocar código.
 */
import { WhatsAppOtpGatewayService } from "../../src/modules/auth-otp/infrastructure/whatsapp/whatsapp-otp-gateway.service";

const GRAPH_API_BASE_URL = "https://graph.facebook.com/v21.0";

const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const testRecipientPhone = process.env.WHATSAPP_TEST_RECIPIENT_PHONE;

const tieneCredenciales = Boolean(token && phoneNumberId);
const describeSiHayCredenciales = tieneCredenciales ? describe : describe.skip;

if (!tieneCredenciales) {
  // eslint-disable-next-line no-console
  console.warn(
    "[whatsapp-otp-gateway.integration.spec] WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID no están " +
      "definidas — se salta todo el archivo. Esto es normal en desarrollo local; en CI, el job " +
      "whatsapp-otp-integration SIEMPRE debería tenerlas definidas (ver .github/workflows/whatsapp-otp-integration.yml).",
  );
}

describeSiHayCredenciales("WhatsAppOtpGatewayService (integración real contra WhatsApp Cloud API)", () => {
  it("las credenciales autentican contra la Graph API real (GET del número de WhatsApp Business)", async () => {
    const response = await fetch(`${GRAPH_API_BASE_URL}/${phoneNumberId}?fields=id,display_phone_number`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const cuerpo = await response.text();
    expect(response.status).toBe(200);
    // Confirma que la respuesta es de verdad la Graph API devolviendo el
    // número (no solo un 200 vacío/genérico de algún proxy intermedio).
    expect(cuerpo).toContain(String(phoneNumberId));
  });

  const itSiHayDestinatarioDePrueba = testRecipientPhone ? it : it.skip;

  if (!testRecipientPhone) {
    // eslint-disable-next-line no-console
    console.warn(
      "[whatsapp-otp-gateway.integration.spec] WHATSAPP_TEST_RECIPIENT_PHONE no está definida — " +
        "se salta el test de envío end-to-end (enviarOtp) a propósito, sin inventar un número de " +
        "prueba (instrucción explícita del Tech Lead). Ver PR #18 / apps/api/.env.example.",
    );
  }

  itSiHayDestinatarioDePrueba(
    "enviarOtp() manda un mensaje real y la Graph API responde 200",
    async () => {
      const gateway = new WhatsAppOtpGatewayService();
      await expect(gateway.enviarOtp(testRecipientPhone as string, "123456")).resolves.toBeUndefined();
    },
  );
});
