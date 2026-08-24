/**
 * El token es sintácticamente válido y su firma verificó, pero su contenido
 * no alcanza para identificar un usuario de negocio (falta `sub`, o falta
 * un `rol` reconocido en los claims). No confundir con una firma inválida o
 * un token expirado: eso lo rechaza passport-jwt/jwks-rsa antes de llegar
 * acá, devolviendo 401 por su cuenta.
 */
export class TokenInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "TokenInvalidoError";
  }
}
