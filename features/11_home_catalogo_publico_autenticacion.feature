# language: es
# Fuente: docs/08_PRD_Fase3_Historias_de_Usuario_ToolBoxJL.md, Épica 11.

@Epica11 @Fase3
Característica: Experiencia de Entrada, Home & Autenticación
  Como visitante o usuario de ToolBox JL, quiero explorar el catálogo sin
  fricción y autenticarme solo cuando decido alquilar o comprar, con una
  pantalla de login rediseñada y acceso rápido por rol.

  @HU-11.1 @Home @CatalogoPublico @AuthWall
  Escenario: Acceso público al Home de la plataforma
    Dado que soy un visitante anónimo (no autenticado)
    Cuando ingreso a la URL principal "/" del Shell Host
    Entonces se carga directamente el Portal del Cliente con el catálogo de herramientas
    Y visualizo el Hero Banner "Potencia Sin Pausas", la barra de búsqueda, los filtros por categoría y la grilla de productos
    Y puedo interactuar con el cotizador y ver detalles de herramientas sin bloqueos.

  @HU-11.1 @AuthWall
  Escenario: Auth-Wall al hacer clic en Alquilar o Comprar sin sesión iniciada
    Dado que estoy explorando una herramienta como usuario anónimo
    Cuando hago clic en "Alquilar Ahora", "Comprar Herramienta" o "Agregar al Carrito"
    Entonces el sistema intercepta la acción
    Y guarda temporalmente la intención de compra (modelo, fechas, zona seleccionada) en "sessionStorage"
    Y redirige a "/login" con el parámetro "returnUrl" correspondiente
    Y muestra el mensaje informativo: "Inicia sesión o regístrate para confirmar tu reserva o compra".

  @HU-11.1 @AuthWall
  Escenario: Retorno automático al flujo de compra tras autenticación exitosa
    Dado que fui redirigido al login tras intentar alquilar una herramienta
    Cuando completo mi autenticación exitosamente
    Entonces el sistema recupera la intención de compra guardada
    Y me redirige automáticamente de vuelta a la ficha técnica de esa herramienta con mis fechas/zona precargadas, sin que tenga que volver a buscarla en el catálogo.

  @HU-11.2 @Auth @LoginIndustrial
  Escenario: Visualización del panel dividido de inicio de sesión
    Dado que accedo a la ruta "/login" del Shell Host
    Entonces visualizo en el panel izquierdo la ilustración de marca "Potencia Industrial y Trazabilidad sin Pausas" con badge "ToolBox JL Suite"
    Y visualizo en el panel derecho el formulario de autenticación ya existente (correo/contraseña + Google OAuth), restyleado al diseño Industrial Racing
    Y el botón primario tiene el estilo Brand Blue ("#141CDB").

  @HU-11.2 @AccesoRapido
  Escenario: Acceso rápido mediante botones de roles en modo demo
    Dado que estoy en la pantalla de inicio de sesión en entorno no-producción
    Cuando hago clic en uno de los botones rápidos de rol: "Cliente", "Almacenista", "Repartidor", "Gerente" o "Admin"
    Entonces el sistema precarga las credenciales correspondientes
    Y redirige automáticamente al micro-frontend respectivo ("/catalogo", "/logistica/inventario", "/logistica/mi-ruta", "/admin/analitica" o "/admin").
