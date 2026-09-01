# 📑 Especificación de Requerimientos & Historias de Usuario — Fase 3
**ToolBox JL — Ecosistema Inteligente de Alquiler y Venta de Herramientas**

- **Documento:** DOC-PRD-03 (Historias de Usuario Fase 3 — Versión 2.0)
- **Rol:** Analista de Requerimientos & Product Owner
- **Fecha:** Septiembre 2026
- **Estado:** Aprobado para Planificación de Sprints
- **Metodología:** Spec-Driven Development (SDD) + Clean Architecture / DDD + Gherkin BDD

---

## 🧭 1. Resumen Ejecutivo & Matriz de Trazabilidad (12 Historias de Usuario)

La **Fase 3** transforma la experiencia de entrada de **ToolBox JL** estableciendo el **Catálogo de Herramientas como Home Principal (`/`) de acceso público**, permitiendo que cualquier visitante explore herramientas, filtre categorías y cotice sin fricción, requiriendo autenticación o registro únicamente al momento de concretar un alquiler, compra o checkout. Además, integra el rediseño industrial de login, carrito de compras multi-ítem, módulo integral de inventario QR con mantenimiento y rutas, conserje de voz interactivo y panel de KPIs gerencial bajo el sistema de diseño **Industrial Racing** de Google Stitch (Proyecto `6704671418307409330`).

| # HU | Módulo / Aplicación | Épica | Título de la Historia de Usuario | Premisa / Ref. Stitch |
|:---:|---|:---:|---|:---:|
| **HU-11.1** | `apps/shell` & `apps/portal-cliente` | **Épica 11** | **Catálogo como Home Principal con Navegación Pública y Auth-Wall para Alquiler/Compra** | **Premisa Principal (Home & Auth-Wall)** |
| **HU-11.2** | `apps/shell` | **Épica 11** | **Rediseño Industrial de Pantalla de Inicio de Sesión y Acceso Rápido por Roles** | Premisa 1 (`5e2670034e384f1a804fe9778a40c4a0`) |
| **HU-12.1** | `apps/portal-cliente` | **Épica 12** | **Paginación de Catálogo y Listado Inferior de Pedidos Activos del Cliente** | Premisa 2 (`9b3db40e3e6f4377a81f0c5ced788a08`) |
| **HU-12.2** | `apps/portal-cliente` | **Épica 12** | **Ficha Técnica con Precio de Venta, Zonas Dinámicas (Medellín/Bogotá) y Desglose Unificado** | Premisa 3 (`9b3db40e3e6f4377a81f0c5ced788a08`) |
| **HU-12.3** | `apps/portal-cliente` | **Épica 12** | **Módulo de Carrito de Compras Multi-Ítem con Gestión de Cantidades y Totales** | Premisa 4 (`8f340895079f439aab00fd8e145394b6`) |
| **HU-13.1** | `apps/panel-admin` | **Épica 13** | **Panel Administrativo de Gestión de Inventario QR con Métricas y Filtros** | Premisa 5 (`90a1921e1af741d5a204fcac9a9381b7`) |
| **HU-13.2** | `apps/panel-admin` | **Épica 13** | **Alta de Nuevas Herramientas Físicas y Generación de Códigos QR Serializados** | Premisa 6 (`f865b1fcfd57438cb45889f8a32a91c7`) |
| **HU-13.3** | `apps/panel-admin` | **Épica 13** | **Pestaña de Gestión de Mantenimiento y Baja de Activos** | Premisa 7 (`f865b1fcfd57438cb45889f8a32a91c7`) |
| **HU-13.4** | `apps/panel-admin` | **Épica 13** | **Pestaña de Rutas de Repartidores y Despachos en Inventario** | Premisa 8 (`f865b1fcfd57438cb45889f8a32a91c7`) |
| **HU-14.1** | `apps/portal-cliente` | **Épica 14** | **Mensaje de Voz de Bienvenida Proactivo en Conserje de Voz** | Premisa 9 (`9b3db40e3e6f4377a81f0c5ced788a08`) |
| **HU-14.2** | `apps/portal-cliente` | **Épica 14** | **Indicador Visual de Acciones y Tool Calling en Tiempo Real** | Premisa 10 (`9b3db40e3e6f4377a81f0c5ced788a08`) |
| **HU-15.1** | `apps/panel-admin` | **Épica 15** | **Rediseño Gerencial de Dashboard de KPIs con Alertas Críticas y ROI** | Premisa 11 (`9508c76700cf40d5863a50c7715062cd`) |

---

## 🚀 ÉPICA 11: Experiencia de Entrada, Home & Autenticación (Fase 3)

### 🌟 HU-11.1: Catálogo como Home Principal con Navegación Pública y Auth-Wall para Alquiler/Compra
- **Prioridad:** Máxima (Crítica / Cambio Principal #1).
- **Referencia Stitch:** `Portal Cliente - Rediseño Industrial Racing` (`9b3db40e3e6f4377a81f0c5ced788a08`).
- **Como:** Visitante o cliente nuevo de ToolBox JL.
- **Quiero:** Que la página principal (`/`) sea directamente el Catálogo de Herramientas para explorar, filtrar y cotizar libremente sin tener que iniciar sesión previamente, y que únicamente se me solicite autenticarme o registrarme cuando decida alquilar, comprar o proceder al checkout.
- **Para:** Descubrir la oferta de herramientas con cero fricción y autenticarme solo en el momento de alta intención de compra.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
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
```

#### Reglas de Negocio & Especificaciones Técnicas
- **Componentes Afectados:** `apps/shell/src/app/app.routes.ts` (enrutamiento de `/` hacia el remote entry de `portal-cliente/catalogo`), `apps/portal-cliente/src/app/guards/auth-wall.guard.ts` (intercepta acciones de checkout), `apps/shell/src/app/features/auth/login/`.
- **Experiencia de Usuario:**
  - Header muestra botones: `"Iniciar Sesión"` y `"Registrarse"` si es anónimo; `"Mi Cuenta"`, `"Mis Pedidos"` y `"Cerrar Sesión"` si está autenticado.
  - La navegación es 100% pública para SEO y conversión.

---

### HU-11.2: Rediseño Industrial de Pantalla de Inicio de Sesión y Acceso Rápido por Roles
- **Prioridad:** Alta.
- **Referencia Stitch:** `Inicio de Sesión - Rediseño Industrial` (`5e2670034e384f1a804fe9778a40c4a0`).
- **Como:** Usuario de la plataforma (Cliente, Almacenista, Repartidor o Administrador).
- **Quiero:** Una interfaz de inicio de sesión moderna, industrial y dividida en dos paneles, con soporte para autenticación rápida y botones de roles de demostración.
- **Para:** Acceder de forma segura, ágil y diferenciada según mi perfil operativo o comercial.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
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
```

---

## 🛒 ÉPICA 12: Catálogo Avanzado & Carrito de Compras (Fase 3)

### HU-12.1: Paginación de Catálogo y Listado Inferior de Pedidos Activos del Cliente
- **Prioridad:** Alta.
- **Referencia Stitch:** `Portal Cliente - Rediseño Industrial Racing` (`9b3db40e3e6f4377a81f0c5ced788a08`).
- **Como:** Cliente de ToolBox JL.
- **Quiero:** Navegar por el catálogo de herramientas con paginación optimizada y ver en la parte inferior de la página el historial paginado de mis pedidos activos en tiempo real.
- **Para:** Encontrar herramientas rápidamente sin sobrecarga visual y monitorear el estado de mis alquileres y compras vigentes en un solo lugar.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
@Epica12 @Fase3 @HU-12.1 @Catalogo @PedidosActivos
Característica: Paginación de Catálogo y Listado Inferior de Pedidos Activos
  Como cliente
  Quiero paginar el catálogo de herramientas y ver mis pedidos activos en la parte inferior
  Para tener control total de mi consumo y reservas.

  Escenario: Paginación de la grilla de herramientas
    Dado que existen más de 6 herramientas registradas en el catálogo
    Cuando navego en "/catalogo"
    Entonces se muestran las primeras 6 herramientas por página
    Y visualizo la barra de paginación con selector de tamaño (6, 12, 24), página actual y botones "Anterior" y "Siguiente"
    Y al cambiar de página la grilla se actualiza dinámicamente.

  Escenario: Visualización y ordenamiento de pedidos activos en la parte inferior
    Dado que soy un cliente autenticado con pedidos activos registrados ("pendiente", "en_preparacion" o "en_camino")
    Cuando me desplazo a la sección inferior "Mis Pedidos Activos" en el Home / Catálogo
    Entonces visualizo una tabla/cards con los pedidos ordenados cronológicamente del más reciente al más antiguo
    Y cada pedido muestra: ID de Orden, Fecha, Herramientas, Modalidad (Alquiler/Venta), Estado con Badge de color y Total COP.

  Escenario: Paginación del listado de pedidos activos
    Dado que tengo más de 5 pedidos registrados
    Cuando consulto la sección "Mis Pedidos Activos"
    Entonces la lista se pagina en bloques de 5 pedidos con controles de navegación.
```

---

### HU-12.2: Ficha Técnica con Precio de Venta, Zonas Logísticas Dinámicas (Medellín/Bogotá) y Desglose Unificado
- **Prioridad:** Alta.
- **Referencia Stitch:** `Portal Cliente - Rediseño Industrial Racing` (`9b3db40e3e6f4377a81f0c5ced788a08`).
- **Como:** Cliente interesado en cotizar o comprar una herramienta.
- **Quiero:** Ver claramente el precio de venta si está disponible, seleccionar mi ciudad (`Medellín` o `Bogotá`) para que las zonas de entrega se filtren automáticamente, ver un desglose de costos limpio sin duplicados y disponer de un botón directo para añadir al carrito.
- **Para:** Obtener una cotización exacta y sin errores de cálculo según mi ubicación geográfica.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
@Epica12 @Fase3 @HU-12.2 @DetalleProducto @Cotizador @Zonas
Característica: Ficha Técnica con Precio de Venta, Zonas Dinámicas y Cotización Unificada
  Como cliente consultando el detalle de una herramienta
  Quiero ver el valor de venta, seleccionar mi ciudad y zonas correspondientes, y ver un desglose sin duplicados
  Para cotizar con precisión y agregar al carrito.

  Escenario: Visualización del precio de venta directa
    Dado que consulto un modelo configurado con "disponible_para_venta: true" y "precio_venta: 1850000"
    Cuando visualizo la cabecera del detalle del producto
    Entonces se muestra claramente el badge de venta con el precio formateado "COP $1.850.000"
    Y la tarifa diaria de alquiler "COP $45.000 / día".

  Escenario: Filtrado dinámico de zonas logísticas por ciudad seleccionada
    Dado que estoy en la sección de cotización de la herramienta
    Cuando selecciono la ciudad "Medellín" en la lista desplegable
    Entonces la lista desplegable de zonas se actualiza mostrando: "Poblado", "Laureles", "Belén", "Envigado", "Bello", "Itagüí", "Centro"
    Y cuando cambio la ciudad a "Bogotá"
    Entonces la lista de zonas se actualiza mostrando: "Chapinero", "Usaquén", "Suba", "Engativá", "Fontibón", "Calle 80", "Zona Industrial", "Centro".

  Escenario: Desglose de cotización unificado sin duplicados
    Dado que selecciono fechas de alquiler de 3 días y la zona "Chapinero"
    Cuando el cotizador calcula el presupuesto
    Entonces el desglose muestra una única vez cada concepto:
      | Concepto |
      | Tarifa base de alquiler (3 días) |
      | Recargo logístico de transporte |
      | Depósito de garantía reembolsable |
      | Total a Pagar COP |
    Y no se repite ningún concepto en el resumen.

  Escenario: Botón para agregar al carrito de compras
    Dado que la cotización o compra está configurada
    Cuando hago clic en el botón primario "Agregar al Carrito"
    Entonces el ítem se añade al carrito con la configuración seleccionada (fechas, ciudad, zona, modalidad)
    Y se muestra una notificación toast de confirmación y el contador del carrito se incrementa.
```

---

### HU-12.3: Módulo de Carrito de Compras Multi-Ítem con Gestión de Cantidades y Totales
- **Prioridad:** Alta.
- **Referencia Stitch:** `Carrito de Compras - ToolBox JL` (`8f340895079f439aab00fd8e145394b6`).
- **Como:** Cliente con múltiples necesidades de equipamiento en obra.
- **Quiero:** Una vista dedicada de Carrito de Compras donde pueda gestionar múltiples herramientas (alquiler y venta), ajustar cantidades, eliminar productos y ver el total consolidado.
- **Para:** Procesar todas las herramientas de mi proyecto en un solo pedido y pago eficiente.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
@Epica12 @Fase3 @HU-12.3 @CarritoCompras
Característica: Módulo de Carrito de Compras Multi-Ítem
  Como cliente con herramientas agregadas
  Quiero gestionar mi carrito de compras según el diseño de Stitch
  Para revisar y confirmar mi orden consolidada.

  Escenario: Visualización del listado de ítems en el carrito
    Dado que he agregado 2 o más herramientas al carrito (alquiler y/o venta)
    Cuando accedo a la ruta "/carrito"
    Entonces visualizo cada producto con: Imagen miniatura, Nombre, Marca, Modalidad (Alquiler con fechas o Venta), Tarifa unitaria, Control de cantidad (+/-) y Subtotal.

  Escenario: Modificación de cantidades de un producto
    Dado que tengo un producto en el carrito con cantidad 1
    Cuando hago clic en el botón "+"
    Entonces la cantidad aumenta a 2
    Y el subtotal del ítem y el total general del carrito se recalculan automáticamente.

  Escenario: Eliminación de un producto del carrito
    Dado que tengo productos en el carrito
    Cuando hago clic en el botón de eliminar (icono basurero) de un producto
    Entonces el producto se remueve de la lista
    Y el total general se actualiza inmediatamente
    Y si no quedan productos, se muestra la vista de "Tu carrito está vacío" con botón "Explorar Catálogo".

  Escenario: Cálculo del resumen de compra consolidado
    Dado que tengo herramientas en el carrito
    Entonces el panel lateral de resumen muestra:
      | Subtotal Alquileres COP |
      | Subtotal Ventas Directas COP |
      | Recargo Logístico Consolidado |
      | Total Depósitos de Garantía Reembolsables |
      | Gran Total a Pagar COP |
    Y un botón destacado "Proceder al Pago / Confirmar Orden".
```

---

## 🛠️ ÉPICA 13: Gestión Integral de Inventario QR & Trazabilidad (Fase 3)

### HU-13.1: Panel Administrativo de Gestión de Inventario QR con Métricas y Filtros
- **Prioridad:** Media-Alta.
- **Referencia Stitch:** `Gestión de Inventario QR` (`90a1921e1af741d5a204fcac9a9381b7`) / `Gestión Inventario - Rediseño Admin` (`f865b1fcfd57438cb45889f8a32a91c7`).
- **Como:** Administrador o Almacenista de ToolBox JL.
- **Quiero:** Un panel administrativo completo de Inventario QR con tarjetas de métricas de flota, pestañas de navegación interna y tabla filtrable de unidades físicas serializadas.
- **Para:** Auditar el inventario físico en tiempo real y conocer la disponibilidad y estado de cada equipo.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
@Epica13 @Fase3 @HU-13.1 @InventarioQR @Admin
Característica: Panel Administrativo de Gestión de Inventario QR
  Como administrador o almacenista
  Quiero un panel centralizado de inventario con métricas y tabla filtrable
  Para auditar y gestionar las unidades físicas por QR.

  Escenario: Visualización de tarjetas de métricas de inventario
    Dado que accedo a "/logistica/inventario" en el Panel Admin
    Entonces visualizo 4 tarjetas de KPIs superiores: Total Unidades Registradas, Unidades Operativas, Unidades en Alquiler y Unidades en Mantenimiento/Baja.

  Escenario: Filtros y búsqueda en tabla de unidades físicas
    Dado que estoy en la pestaña "Inventario General"
    Cuando ingreso un término de búsqueda por código QR, Serial o Modelo
    O selecciono un filtro por Estado ("Operativo", "En Alquiler", "En Mantenimiento", "Dado de Baja")
    Entonces la tabla filtra instantáneamente las unidades físicas correspondientes
    Y muestra por cada fila: Código QR, Serial Fabricante, Modelo, Categoría, Estado con Badge, Ubicación en Bodega y Botones de Acción ("Ver QR", "Historial", "Cambiar Estado").
```

---

### HU-13.2: Alta de Nuevas Herramientas Físicas y Generación de Códigos QR Serializados
- **Prioridad:** Media-Alta.
- **Referencia Stitch:** `Gestión Inventario - Rediseño Admin` (`f865b1fcfd57438cb45889f8a32a91c7`).
- **Como:** Almacenista o Administrador de inventario.
- **Quiero:** Un formulario modal e interactivo para registrar el ingreso de nuevas unidades físicas y generar automáticamente su código QR imprimible con identificador único serializado.
- **Para:** Etiquetar físicamente las herramientas al recibirlas del proveedor antes de habilitarlas para alquiler.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
@Epica13 @Fase3 @HU-13.2 @RegistroHerramienta @GeneracionQR
Característica: Registro de Nuevas Herramientas y Generación de QR
  Como almacenista
  Quiero registrar nuevas unidades y generar su código QR único
  Para incorporarlas al inventario activo.

  Escenario: Apertura del formulario de registro desde el panel
    Dado que estoy en el panel de Gestión de Inventario QR
    Cuando hago clic en el botón superior "+ Registrar Nueva Unidad" o "Generar Nuevo QR"
    Entonces se abre un modal con el formulario de alta de unidad física.

  Escenario: Registro exitoso y generación de QR imprimible
    Dado que completo los campos obligatorios: Modelo de Herramienta, Número de Serie del Fabricante, Fecha de Adquisición, Costo de Compra y Ubicación en Bodega (Estante/Fila)
    Cuando hago clic en "Guardar y Generar QR"
    Entonces el sistema registra la unidad en "POST /inventory/units"
    Y genera un código QR vectorial con el UUID y código de serie (ej: "TBJL-DEM-0089")
    Y muestra una vista previa lista para imprimir en impresora térmica de etiquetas con el logo de ToolBox JL.
```

---

### HU-13.3: Pestaña de Gestión de Mantenimiento y Baja de Activos
- **Prioridad:** Media.
- **Referencia Stitch:** `Gestión Inventario - Rediseño Admin` (`f865b1fcfd57438cb45889f8a32a91c7`).
- **Como:** Jefe de Mantenimiento o Almacenista.
- **Quiero:** Una pestaña dedicada en el panel de inventario para gestionar el flujo de mantenimiento preventivo/correctivo y registrar actas de baja definitiva de herramientas.
- **Para:** Garantizar la seguridad operativa de los equipos en obra y mantener actualizada la flota disponible.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
@Epica13 @Fase3 @HU-13.3 @Mantenimiento @BajaActivos
Característica: Pestaña de Mantenimiento y Baja de Activos
  Como encargado de mantenimiento
  Quiero supervisar las unidades en taller y registrar bajas o retornos a servicio
  Para controlar los costos de reparación y disponibilidad de la flota.

  Escenario: Visualización de la pestaña de mantenimiento
    Dado que estoy en el panel de Gestión de Inventario QR
    Cuando hago clic en la pestaña "Mantenimiento & Taller"
    Entonces visualizo la lista de herramientas actualmente en reparación o inspección
    Y las herramientas que han sido dadas de baja con su motivo documentado.

  Escenario: Asignación de una unidad a mantenimiento
    Dado que selecciono una herramienta de la lista
    Cuando registro la orden de taller indicando: Tipo (Preventivo / Correctivo), Falla reportada, Técnico asignado, Costo estimado y Fecha prevista de finalización
    Entonces el estado de la unidad cambia a "En Mantenimiento"
    Y la unidad deja de estar disponible para alquiler en el catálogo público
    Y el evento se añade a la hoja de vida de la unidad.

  Escenario: Retorno a estado operativo o baja definitiva
    Dado que una herramienta ha finalizado su reparación o presenta daño irreparable
    Cuando el técnico marca "Reintegrar a Servicio" (con checklist superado) o "Declarar Baja Definitiva" (con acta de descarte)
    Entonces el sistema actualiza el estado a "Operativo" o "Dado de Baja" respectivamente.
```

---

### HU-13.4: Pestaña de Rutas de Repartidores y Despachos en Inventario
- **Prioridad:** Media.
- **Referencia Stitch:** `Gestión Inventario - Rediseño Admin` (`f865b1fcfd57438cb45889f8a32a91c7`).
- **Como:** Coordinador de Logística o Administrador.
- **Quiero:** Una pestaña de "Rutas y Despachos" dentro de Gestión de Inventario para monitorear las rutas asignadas a los diferentes repartidores por el Agente de Ruteo.
- **Para:** Conocer el avance de las entregas y recolecciones en tiempo real sin salir del panel administrativo.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
@Epica13 @Fase3 @HU-13.4 @RutasRepartidores @LogisticaAdmin
Característica: Monitor de Rutas de Repartidores en Inventario
  Como coordinador de logística
  Quiero ver las rutas de todos los repartidores en el panel de inventario
  Para supervisar el cumplimiento de despachos en obra.

  Escenario: Visualización de rutas activas por repartidor
    Dado que el Agente 1 de Ruteo ha generado las rutas del día
    Cuando accedo a la pestaña "Rutas del Día" en el panel de inventario
    Entonces visualizo la lista de repartidores activos con: Nombre, Vehículo/Placa, Total de Paradas, Barra de Porcentaje de Avance y Estado de la Ruta ("En Progreso", "Completada", "Pendiente").

  Escenario: Detalle de paradas de un repartidor específico
    Dado que hago clic en un repartidor de la lista
    Entonces se despliega el itinerario secuencial de paradas distinguiendo "Entrega" vs "Recolección"
    Y muestra la dirección de obra, cliente, herramientas asignadas con sus seriales y hora estimada de llegada.
```

---

## 🎙️ ÉPICA 14: Conserje de Voz AI Avanzado (Fase 3)

### HU-14.1: Mensaje de Voz de Bienvenida Proactivo en Conserje de Voz
- **Prioridad:** Media-Alta.
- **Referencia Stitch:** `Portal Cliente - Rediseño Industrial Racing` (`9b3db40e3e6f4377a81f0c5ced788a08`).
- **Como:** Cliente que hace clic en el widget del Conserje de Voz.
- **Quiero:** Que el agente de voz me salude automáticamente con una bienvenida hablada y me indique cómo puede ayudarme.
- **Para:** Tener una experiencia natural y conversacional inmediata sin tener que adivinar qué preguntarle.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
@Epica14 @Fase3 @HU-14.1 @ConserjeVoz @BienvenidaAudio
Característica: Mensaje de Voz de Bienvenida Proactivo
  Como cliente interactuando con el widget de voz
  Quiero escuchar un saludo de bienvenida automático al iniciar la sesión de voz
  Para comenzar la conversación con fluidez.

  Escenario: Reproducción automática del saludo al conectar la sala de voz
    Dado que hago clic en el botón flotante del Conserje de Voz ("Hablar con Conserje")
    Cuando se establece la conexión WebRTC con la sala de LiveKit
    Entonces el agente sintetiza y reproduce inmediatamente el mensaje de bienvenida por audio:
      "¡Hola! Soy tu Conserje de Voz de ToolBox JL. Estoy aquí para asesorarte con la herramienta adecuada para tu obra, cotizar alquileres o revisar tu pedido. ¿En qué te puedo ayudar hoy?"
    Y el texto del saludo aparece simultáneamente en el transcript visual del widget.
```

---

### HU-14.2: Indicador Visual de Acciones y Tool Calling en Tiempo Real en Conserje de Voz
- **Prioridad:** Media.
- **Referencia Stitch:** `Portal Cliente - Rediseño Industrial Racing` (`9b3db40e3e6f4377a81f0c5ced788a08`).
- **Como:** Cliente conversando con el Conserje de Voz.
- **Quiero:** Ver indicadores visuales dinámicos de lo que el agente está haciendo en segundo plano mientras procesa mi solicitud.
- **Para:** Saber que la IA está consultando el catálogo, calculando cotizaciones o verificando disponibilidad en tiempo real.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
@Epica14 @Fase3 @HU-14.2 @ConserjeVoz @ToolCallingFeedback
Característica: Indicador Visual de Acciones y Tool Calling en Tiempo Real
  Como cliente hablando con el Conserje de Voz
  Quiero ver en pantalla las acciones y llamadas a herramientas que ejecuta la IA
  Para tener transparencia del proceso de respuesta.

  Escenario: Visualización de chips de acción en vivo durante la llamada a tools
    Dado que le pido al agente: "Necesito una cortadora de concreto para Bogotá por 4 días"
    Cuando el agente procesa el turno y ejecuta las funciones de backend
    Entonces el widget muestra badges/chips animados con el estado de la acción:
      | Estado Visual |
      | "🔍 Buscando herramientas en catálogo..." |
      | "📍 Calculando tarifa y logística para Bogotá..." |
      | "📦 Verificando unidades disponibles..." |
    Y al concluir la ejecución, el chip pasa a estado completado ("✓") y el agente responde por voz con los datos exactos.
```

---

## 📊 ÉPICA 15: Business Intelligence & Dashboard Gerencial (Fase 3)

### HU-15.1: Rediseño Gerencial de Dashboard de KPIs con Alertas Críticas y ROI
- **Prioridad:** Media-Alta.
- **Referencia Stitch:** `Dashboard KPIs - Rediseño Gerencial` (`9508c76700cf40d5863a50c7715062cd`).
- **Como:** Director General o Gerente de Operaciones de ToolBox JL.
- **Quiero:** Un dashboard ejecutivo con KPIs macrofinancieros, gráfico comparativo mensual de ingresos, análisis de ROI por categoría y un panel de alertas críticas de la operación.
- **Para:** Tomar decisiones estratégicas de compra de herramientas, gestión de moras y optimización de rentabilidad.

#### Criterios de Aceptación (Gherkin BDD)
```gherkin
@Epica15 @Fase3 @HU-15.1 @DashboardGerencial @KPIsStitch
Característica: Rediseño Gerencial de Dashboard de KPIs
  Como director general o gerente
  Quiero un panel ejecutivo de alto nivel según el diseño de Stitch
  Para evaluar el desempeño financiero y operativo del negocio.

  Escenario: Visualización de KPIs ejecutivos de alto impacto
    Dado que accedo a "/admin/dashboard-kpis"
    Entonces visualizo las métricas consolidadas: Ingresos Totales del Mes (COP) con variación porcentual, Tasa de Ocupación Global de Flota (%), Total Recaudado por Moras (COP) e Índice de Retorno de Inversión Promedio (ROI %).

  Escenario: Panel de Alertas Críticas del Negocio
    Dado que existen herramientas con más de 3 ingresos a taller en el mes o clientes con más de 5 días de mora
    Cuando visualizo el panel de "Alertas Críticas":
    Entonces se listan tarjetas de alerta clasificadas por severidad (Alta, Media, Informativa) con botones de acción directa ("Revisar Ficha / Dar de Baja", "Ver Contrato / Contactar").
```

---

## 📅 2. Plan de Sprints Reorganizado (Fase 3)

| Sprint | Historias de Usuario | Épica | Entregable Clave |
|---|---|---|---|
| **Sprint 12** | **HU-11.1, HU-11.2, HU-12.1, HU-12.2** | Épicas 11, 12 | **Catálogo como Home Público con Auth-Wall**, Rediseño de Login Industrial, Catálogo paginado con pedidos activos, Detalle con precio de venta y zonas Medellín/Bogotá. |
| **Sprint 13** | **HU-12.3, HU-14.1, HU-14.2** | Épicas 12, 14 | Módulo de Carrito de Compras completo, Conserje de Voz con bienvenida hablada y visualización de Tool Calling en vivo. |
| **Sprint 14** | **HU-13.1, HU-13.2, HU-13.3, HU-13.4** | Épica 13 | Panel de Gestión de Inventario QR completo: Alta con QR, Pestaña de Mantenimiento/Bajas y Pestaña de Rutas. |
| **Sprint 15** | **HU-15.1, QA & E2E Fase 3** | Épica 15 | Dashboard de KPIs Gerencial de Stitch, suite de pruebas unitarias/E2E, cobertura 85%+ y cierre de release Fase 3. |

---

## ✅ 3. Definition of Done (DoD) Ampliada
Cada HU de la Fase 3 se considerará terminada y lista para mergear a `dev` cuando:
1. **Contrato OpenAPI**: Todos los DTOs y endpoints nuevos estén declarados en `openapi.yaml` y validados con Spectral.
2. **Escenarios Gherkin**: Los criterios de aceptación Gherkin definidos en este documento cuenten con pruebas automatizadas passing en Jest / Playwright.
3. **Fidelidad Visual Stitch**: Los componentes implementados reflejen fielmente los tokens, tipografías y layouts de Google Stitch.
4. **CI/CD en Verde**: El PR hacia `dev` pase el pipeline completo de Turborepo (Lint, Typecheck, Test, Build) sin advertencias.
