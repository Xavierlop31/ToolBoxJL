# language: es
# Fuente: docs/08_PRD_Fase3_Historias_de_Usuario_ToolBoxJL.md, Épica 13.

@Epica13 @Fase3
Característica: Panel Administrativo de Gestión de Inventario QR
  Como administrador o almacenista de ToolBox JL
  Quiero un panel centralizado de inventario con métricas, alta de unidades,
  gestión de mantenimiento/bajas y monitoreo de rutas
  Para auditar y gestionar la flota de herramientas físicas por QR.

  @HU-13.1 @InventarioQR @Admin
  Escenario: Visualización de tarjetas de métricas de inventario
    Dado que accedo a "/logistica/inventario" en el Panel Admin
    Entonces visualizo 4 tarjetas de KPIs superiores: Total Unidades Registradas, Unidades Operativas, Unidades en Alquiler y Unidades en Mantenimiento/Baja.

  @HU-13.1 @InventarioQR @Admin
  Escenario: Filtros y búsqueda en tabla de unidades físicas
    Dado que estoy en la pestaña "Inventario General"
    Cuando ingreso un término de búsqueda por código QR, Serial o Modelo, o selecciono un filtro por Estado ("Operativo", "En Alquiler", "En Mantenimiento", "Dado de Baja")
    Entonces la tabla filtra instantáneamente las unidades físicas correspondientes
    Y muestra por cada fila: Código QR, Serial Fabricante, Modelo, Categoría, Estado con Badge, Ubicación en Bodega y Botones de Acción ("Ver QR", "Historial", "Cambiar Estado").

  @HU-13.2 @RegistroHerramienta @GeneracionQR
  Escenario: Apertura del formulario de registro desde el panel
    Dado que estoy en el panel de Gestión de Inventario QR
    Cuando hago clic en el botón superior "+ Registrar Nueva Unidad" o "Generar Nuevo QR"
    Entonces se abre un modal con el formulario de alta de unidad física.

  @HU-13.2 @RegistroHerramienta @GeneracionQR
  Escenario: Registro exitoso y generación de QR imprimible
    Dado que completo los campos obligatorios: Modelo de Herramienta, Número de Serie del Fabricante, Fecha de Adquisición, Costo de Compra y Ubicación en Bodega (Estante/Fila)
    Cuando hago clic en "Guardar y Generar QR"
    Entonces el sistema registra la unidad en "POST /inventory/units"
    Y genera un código QR vectorial con el UUID y código de serie (ej: "TBJL-DEM-0089")
    Y muestra una vista previa lista para imprimir en impresora térmica de etiquetas con el logo de ToolBox JL.

  @HU-13.3 @Mantenimiento @BajaActivos
  Escenario: Visualización de la pestaña de mantenimiento
    Dado que estoy en el panel de Gestión de Inventario QR
    Cuando hago clic en la pestaña "Mantenimiento & Taller"
    Entonces visualizo la lista de herramientas actualmente en reparación o inspección
    Y las herramientas que han sido dadas de baja con su motivo documentado.

  @HU-13.3 @Mantenimiento @BajaActivos
  Escenario: Asignación de una unidad a mantenimiento
    Dado que selecciono una herramienta de la lista
    Cuando registro la orden de taller indicando: Tipo (Preventivo / Correctivo), Falla reportada, Técnico asignado, Costo estimado y Fecha prevista de finalización
    Entonces el estado de la unidad cambia a "En Mantenimiento"
    Y la unidad deja de estar disponible para alquiler en el catálogo público
    Y el evento se añade a la hoja de vida de la unidad.

  @HU-13.3 @Mantenimiento @BajaActivos
  Escenario: Retorno a estado operativo o baja definitiva
    Dado que una herramienta ha finalizado su reparación o presenta daño irreparable
    Cuando el técnico marca "Reintegrar a Servicio" (con checklist superado) o "Declarar Baja Definitiva" (con acta de descarte)
    Entonces el sistema actualiza el estado a "Operativo" o "Dado de Baja" respectivamente.

  @HU-13.4 @RutasRepartidores @LogisticaAdmin
  Escenario: Visualización de rutas activas por repartidor
    Dado que el Agente 1 de Ruteo ha generado las rutas del día
    Cuando accedo a la pestaña "Rutas del Día" en el panel de inventario
    Entonces visualizo la lista de repartidores activos con: Nombre, Vehículo/Placa, Total de Paradas, Barra de Porcentaje de Avance y Estado de la Ruta ("En Progreso", "Completada", "Pendiente").

  @HU-13.4 @RutasRepartidores @LogisticaAdmin
  Escenario: Detalle de paradas de un repartidor específico
    Dado que hago clic en un repartidor de la lista
    Entonces se despliega el itinerario secuencial de paradas distinguiendo "Entrega" vs "Recolección"
    Y muestra la dirección de obra, cliente, herramientas asignadas con sus seriales y hora estimada de llegada.
