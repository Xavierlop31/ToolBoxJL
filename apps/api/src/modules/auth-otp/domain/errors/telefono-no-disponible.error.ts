/**
 * Se lanza en `POST /auth/otp/request` cuando el usuario autenticado no
 * tiene un teléfono registrado disponible para enviar el OTP.
 *
 * *** Nota de implementación (documentada, no un supuesto silencioso) ***:
 * `UsuarioAutenticado`/el JWT de Supabase Auth no tenían, antes de este
 * módulo, ningún claim de teléfono — el contrato (openapi.yaml) y los docs
 * tampoco especifican de dónde sale "el teléfono registrado del usuario"
 * que menciona la descripción de `requestDeviceOtp`. Se asumió, siguiendo
 * el mismo patrón que el claim de rol de negocio (`app_metadata.rol` /
 * `user_metadata.rol`, ver `VerificarAccesoUseCase`), que el teléfono llega
 * en `app_metadata.telefono` / `user_metadata.telefono` del JWT — ver
 * `UsuarioAutenticado.telefono` (packages/shared-types) y el punto donde se
 * puebla en `VerificarAccesoUseCase`. Si el proyecto Supabase real no puebla
 * ese claim (falta configurarlo en el Custom Access Token Hook, igual que
 * el rol), todo usuario recibe este error al pedir un OTP — es un gap que
 * el Tech Lead debería confirmar con el Arquitecto antes de Sprint 6 en
 * producción (ver PR #18).
 */
export class TelefonoNoDisponibleError extends Error {
  constructor(usuarioId: string) {
    super(
      `El usuario "${usuarioId}" no tiene un teléfono registrado disponible ` +
        `para enviar el OTP por WhatsApp.`,
    );
    this.name = "TelefonoNoDisponibleError";
  }
}
