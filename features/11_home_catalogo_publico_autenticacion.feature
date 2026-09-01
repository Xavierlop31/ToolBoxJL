# Fase 3 — Épica 11: Experiencia de Entrada, Home & Autenticación
# Fuente: docs/08_PRD_Fase3_Historias_de_Usuario_ToolBoxJL.md

@Epica11 @Fase3 @HU-11.1 @Home @CatalogoPublico @AuthWall
Característica: Catálogo como Home Principal con Auth-Wall
  Como visitante anónimo
  Quiero que la ruta principal "/" sea el catálogo interactivo
  Y que se me solicite inicio de sesión solo al intentar alquilar o comprar.

  Escenario: Acceso público al Home de la plataforma
    Dado que soy un visitante anónimo (no autenticado)
    Cuando ingreso a la URL principal "/" del Shell Host
    Entonces se carga directamente el Portal del Cliente con el catálogo de herramientas
    Y visualizo el Hero Banner "Potencia Sin Pausas", la barra de búsqueda, los filtros por categoría y la grilla de productos
    Y puedo interactuar con el cotizador y ver detalles de herramientas sin bloqueos.

  Escenario: Auth-Wall al hacer clic en Alquilar o Comprar sin sesión iniciada
    Dado que estoy explorando una herramienta como usuario anónimo
    Cuando hago clic en "Alquilar Ahora", "Comprar Herramienta" o "Agregar al Carrito"
    Entonces el sistema intercepta la acción
    Y guarda temporalmente la intención de compra (modelo, fechas, zona seleccionada) en "sessionStorage"
    Y abre un modal o redirige a "/login" con el parámetro "returnUrl" correspondiente
    Y muestra el mensaje informativo: "Inicia sesión o regístrate para confirmar tu reserva o compra".

  Escenario: Retorno automático al flujo de compra tras autenticación exitosa
    Dado que fui redirigido al login tras intentar alquilar una herramienta
    Cuando completo mi autenticación con código OTP exitosamente
    Entonces el sistema recupera la intención de compra guardada
    Y me redirige automáticamente al flujo de confirmación / carrito con mi herramienta y fechas precargadas
    Sin que tenga que volver a buscar la herramienta en el catálogo.

@Epica11 @Fase3 @HU-11.2 @Auth @LoginIndustrial
Característica: Rediseño Industrial de Pantalla de Login
  Como usuario del sistema ToolBox JL
  Quiero una pantalla de login de alto impacto con panel dividido y autenticación por OTP
  Para acceder rápidamente según mi rol.

  Escenario: Visualización del panel dividido de inicio de sesión
    Dado que accedo a la ruta "/login" del Shell Host
    Entonces visualizo en el panel izquierdo la ilustración de marca "Potencia Industrial y Trazabilidad sin Pausas" con badge "ToolBox JL Suite"
    Y visualizo en el panel derecho el formulario con campos para Correo Electrónico / Teléfono Móvil
    Y el botón primario de acción tiene el estilo Brand Blue ("#141CDB") con texto "Continuar con Código OTP".

  Escenario: Selección de método de envío de OTP
    Dado que ingreso mi teléfono o correo en el formulario
    Cuando selecciono el método "WhatsApp" o "Correo Electrónico"
    Y hago clic en "Continuar con Código OTP"
    Entonces el sistema envía la solicitud a "POST /auth/otp/request"
    Y se muestra la pantalla de ingreso del código de 6 dígitos con cuenta regresiva para reenvío (60 segundos).

  Escenario: Acceso rápido mediante botones de roles en modo demo
    Dado que estoy en la pantalla de inicio de sesión en entorno no-producción
    Cuando hago clic en uno de los botones rápidos de rol: "Cliente", "Almacenista", "Repartidor" o "Gerente"
    Entonces el sistema precarga las credenciales correspondientes
    Y redirige automáticamente al micro-frontend respectivo ("/catalogo", "/logistica/inventario", "/logistica/mi-ruta", o "/admin/analitica").
