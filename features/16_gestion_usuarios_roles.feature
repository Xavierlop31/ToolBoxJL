# language: es
# Fuente: pedido directo del Arquitecto 2026-09-11 — no viene del PRD
# original de ninguna Fase. Nueva Épica 16.

@Epica16 @Fase3
Característica: Gestión de Usuarios y Roles
  Como administrador de ToolBox JL, quiero ver el listado de usuarios de la
  plataforma y poder cambiar su rol o desactivar su cuenta, para gestionar
  quién tiene acceso a qué desde el panel administrativo.

  @HU-16.1 @ListadoUsuarios
  Escenario: Listado de usuarios con su rol y estado actual
    Dado que existen usuarios registrados con distintos roles
    Cuando accedo a "/admin/usuarios" en el Panel Admin siendo administrador
    Entonces visualizo la lista de usuarios con su nombre, email, rol actual y si está activo o inactivo
    Y puedo filtrar la lista por rol y por estado, y buscar por nombre o email.

  @HU-16.2 @CambioDeRol
  Escenario: Cambiar el rol de un usuario
    Dado que existe un usuario con rol "cliente"
    Cuando un administrador le cambia el rol a "almacenista"
    Entonces el usuario queda con rol "almacenista" en la lista
    Y el cambio se refleja en su sesión recién la próxima vez que inicie sesión, no de inmediato.

  @HU-16.3 @DesactivarUsuario
  Escenario: Desactivar y reactivar un usuario
    Dado que existe un usuario activo
    Cuando un administrador lo desactiva
    Entonces el usuario queda marcado como inactivo en la lista
    Y no puede volver a iniciar sesión desde ese momento, aunque una sesión ya abierta no se corta de inmediato
    Cuando un administrador lo reactiva
    Entonces el usuario vuelve a poder iniciar sesión con normalidad.

  @HU-16.4 @ProteccionAutoModificacion
  Escenario: Un administrador no puede modificar su propio usuario desde este panel
    Dado que soy un administrador autenticado
    Cuando intento cambiar mi propio rol o desactivar mi propia cuenta desde "/admin/usuarios"
    Entonces la operación se rechaza con un mensaje explicando que no puedo modificarme a mí mismo desde ahí.
