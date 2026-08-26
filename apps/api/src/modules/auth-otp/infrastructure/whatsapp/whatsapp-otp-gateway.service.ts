import { Injectable } from "@nestjs/common";
import type { WhatsAppOtpGateway } from "../../domain/whatsapp-otp-gateway";
import { loadWhatsAppCredentials, loadWhatsAppOtpTemplateConfig } from "../config/whatsapp.config";

/**
 * Implementación real contra WhatsApp Cloud API
 * (`POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`).
 *
 * A diferencia de `WompiGatewayService` (Sprint 3, sin credenciales
 * disponibles), este entorno SÍ tiene credenciales reales de WhatsApp Cloud
 * API cargadas como secrets de GitHub Actions — y por eso, a diferencia de
 * Wompi, esta clase SÍ se ejercita contra la API real en CI (ver
 * `apps/api/test/integration/whatsapp-otp-gateway.integration.spec.ts` y
 * `.github/workflows/whatsapp-otp-integration.yml`).
 *
 * *** Lo que esa validación de CI prueba, y lo que NO prueba (documentado,
 * no silenciado) ***:
 *
 * - SÍ prueba que `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` autentican
 *   contra la Graph API real (`GET /{PHONE_NUMBER_ID}` devuelve 200 con los
 *   datos del número).
 * - NO prueba el envío real de un mensaje end-to-end (`enviarOtp` en sí,
 *   `POST /messages`): eso requiere un número de teléfono destinatario real
 *   y válido para la ventana de conversación de WhatsApp, y este entorno no
 *   tiene uno — no se inventó ninguno a propósito (instrucción explícita
 *   del Tech Lead). Si se define `WHATSAPP_TEST_RECIPIENT_PHONE` (ver
 *   `apps/api/.env.example`), el test de integración SÍ ejercita
 *   `enviarOtp` end-to-end contra ese número; si no está definida, ese test
 *   puntual queda en skip con un mensaje explícito — no en verde falso.
 *
 * Mensaje de tipo `text` por defecto: más simple de implementar y
 * suficiente si el usuario le escribió a este número de WhatsApp Business
 * en las últimas 24h (ventana de conversación abierta gratuita de Meta). Si
 * el dispositivo nuevo se detecta FUERA de esa ventana (típico en un primer
 * login/registro, que es justamente el caso de uso de HU-6.2), Meta
 * rechaza el `text` con el error 131047 ("Re-engagement message") y hace
 * falta un mensaje de tipo `template` de categoría "Authentication"
 * pre-aprobado por Meta Business Manager.
 *
 * *** Ese template NUNCA se puede aprobar en la WABA de este proyecto ***
 * (docs/DESIGN.md §7.1): ToolBox JL es un proyecto académico sin entidad
 * legal constituida, y Meta exige verificación de negocio (Cámara de
 * Comercio / dominio corporativo) para templates "Authentication", que acá
 * no se puede completar — no es un gap temporal, es una restricción
 * permanente y aceptada. Por eso `loadWhatsAppOtpTemplateConfig()` hoy
 * siempre devuelve `null` en la práctica y esta clase manda `type: "text"`
 * — es el comportamiento esperado, no un fallback provisional.
 *
 * La rama `type: "template"` de abajo queda implementada y lista para el
 * día que exista un portafolio de negocio verificado (se activaría con
 * solo cargar `WHATSAPP_OTP_TEMPLATE_NAME`/`WHATSAPP_OTP_TEMPLATE_LANG`,
 * sin tocar código), pero **nunca fue ni puede ser ejercitada contra la API
 * real en este entorno** — mismo criterio de "mapeo sin validar" que
 * `WompiGatewayService` (Sprint 3): el shape del payload sigue la
 * documentación pública de Meta para templates de categoría Authentication
 * con botón `OTP`/`COPY_CODE` (ver
 * `.github/workflows/whatsapp-register-otp-template.yml`, que somete
 * exactamente ese mismo template), pero no está probado end-to-end.
 */
@Injectable()
export class WhatsAppOtpGatewayService implements WhatsAppOtpGateway {
  private static readonly BASE_URL = "https://graph.facebook.com/v21.0";

  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor() {
    const credenciales = loadWhatsAppCredentials();
    this.token = credenciales.token;
    this.phoneNumberId = credenciales.phoneNumberId;
  }

  async enviarOtp(telefono: string, codigo: string): Promise<void> {
    const templateConfig = loadWhatsAppOtpTemplateConfig();

    const body = templateConfig
      ? {
          messaging_product: "whatsapp",
          to: telefono,
          type: "template",
          template: {
            name: templateConfig.name,
            language: { code: templateConfig.lang },
            components: [
              { type: "body", parameters: [{ type: "text", text: codigo }] },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: codigo }],
              },
            ],
          },
        }
      : {
          messaging_product: "whatsapp",
          to: telefono,
          type: "text",
          text: {
            body: `Tu código de verificación de ToolBox JL es ${codigo}. No lo compartas con nadie.`,
          },
        };

    const response = await fetch(
      `${WhatsAppOtpGatewayService.BASE_URL}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const cuerpo = await response.text().catch(() => "<no se pudo leer el cuerpo>");
      throw new Error(
        `WhatsApp Cloud API respondió ${response.status} al enviar el OTP a "${telefono}". ` +
          `Cuerpo: ${cuerpo}`,
      );
    }
  }
}
