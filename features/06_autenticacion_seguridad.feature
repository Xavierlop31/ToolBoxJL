# language: es
# Fuente: PRD (DOC-PRD-01) §5, Épica 6.

@Epica6 @Fase1
Característica: Autenticación y Seguridad de Cuenta
  Como usuario, quiero iniciar sesión de forma segura y confiable, con
  verificación adicional cuando el acceso es desde un dispositivo nuevo.

  @PrioridadAlta
  Escenario: Cliente inicia sesión con correo/contraseña o con Google
    Dado que soy un Cliente sin sesión iniciada
    Cuando inicio sesión con correo y contraseña, o con mi cuenta de Google
    Entonces Supabase Auth valida mis credenciales
    Y obtengo acceso a la plataforma

  @HU-6.2 @PrioridadAlta
  Escenario: Verificación por OTP de WhatsApp en dispositivo nuevo
    Dado que soy un usuario iniciando sesión desde un dispositivo nuevo o registrándome por primera vez
    Cuando el sistema detecta el dispositivo nuevo o el registro
    Entonces se genera un OTP de 6 dígitos y se envía por WhatsApp Cloud API
    Y mi acceso queda bloqueado hasta que ingrese el OTP correcto antes de que expire
