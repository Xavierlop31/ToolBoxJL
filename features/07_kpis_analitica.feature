# language: es
# Fuente: PRD (DOC-PRD-01) §5, Épica 7.

@Epica7
Característica: Tableros de Control, KPIs y Analítica
  Como Gerente, necesito visibilidad de la salud financiera y operativa del
  negocio para tomar decisiones de compra e inversión en inventario.

  @Fase1 @PrioridadAlta
  Escenario: Gerente consulta ingresos totales desglosados
    Dado que soy un Gerente autenticado
    Cuando abro el dashboard de ingresos y selecciono un periodo
    Entonces veo los ingresos totales desglosados en Ventas Directas, Tarifas de Alquiler y Cobros por Mora para ese periodo

  @Fase2 @PrioridadMedia
  Escenario: Gerente consulta el ROI por herramienta
    Dado que soy un Gerente autenticado
    Cuando consulto el ROI de un modelo específico
    Entonces el sistema calcula (Ingresos Acumulados − Costo de Compra) / Costo de Compra × 100 para ese modelo

  @Fase2 @PrioridadMedia
  Escenario: Gerente consulta utilización de inventario y productividad de repartidores
    Dado que soy un Gerente autenticado
    Cuando consulto la tasa de utilización de inventario y la productividad de repartidores del mes
    Entonces veo la Utilización como Días Alquilada entre Días Disponibles del mes
    Y veo la Productividad como Entregas Exitosas entre Ruta Asignada, junto con el tiempo promedio por punto
