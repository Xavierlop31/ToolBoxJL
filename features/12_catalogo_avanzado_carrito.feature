# Fase 3 — Épica 12: Catálogo Avanzado & Carrito de Compras
# Fuente: docs/08_PRD_Fase3_Historias_de_Usuario_ToolBoxJL.md
# HU-12.3 (carrito multi-ítem) es Sprint 13 — se declara acá junto con el resto de la
# Épica 12 pero no se implementa hasta ese sprint.

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

@Epica12 @Fase3 @HU-12.3 @CarritoCompras @Sprint13
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
