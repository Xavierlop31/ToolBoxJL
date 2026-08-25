/**
 * Puerto de gateway de envío de OTP por WhatsApp — mismo criterio de Clean
 * Architecture que `WompiGateway` (PaymentsModule): el dominio declara la
 * interfaz, `infrastructure/whatsapp` la implementa dos veces (real contra
 * WhatsApp Cloud API / fake determinístico para tests-BDD).
 *
 * El código NUNCA se devuelve ni se loguea desde acá hacia afuera del
 * gateway — quien llama a `enviarOtp` ya tiene el código en texto plano
 * solo transitoriamente (ver `SolicitarOtpUseCase`); esta interfaz es la
 * última posta antes de que salga hacia un tercero (Meta).
 */
export interface WhatsAppOtpGateway {
  enviarOtp(telefono: string, codigo: string): Promise<void>;
}
