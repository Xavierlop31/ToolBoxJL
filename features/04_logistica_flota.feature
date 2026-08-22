# language: es
# Fuente: PRD (DOC-PRD-01) §5, Épica 4.

@Epica4 @Fase1
Característica: Logística y Flota
  Como negocio, necesito gestionar mi flota de reparto y dar visibilidad del
  estado de cada envío.

  @RF-3.1 @PrioridadAlta
  Escenario: Administrador registra un vehículo de la flota
    Dado que soy un Administrador autenticado
    Cuando registro un vehículo con su tipo, capacidad de carga en kg y m³, y zonas geográficas asociadas
    Entonces el vehículo queda disponible para asignación de rutas

  @RF-3.3 @PrioridadAlta
  Escenario: Gerente monitorea el estado de los envíos en tiempo real
    Dado que soy un Gerente autenticado
    Cuando abro el panel de seguimiento de envíos
    Entonces veo el estado de cada pedido en curso entre "Pendiente de Asignación", "En Ruta de Entrega", "Entregado", "En Ruta de Recogida" y "Retornado"
    Y los estados se actualizan en tiempo real vía Supabase Realtime sin recargar la página

  @RF-3.2 @PrioridadMedia
  Escenario: Recargo logístico calculado por peso de la herramienta
    Dado que soy un Cliente cotizando un alquiler con entrega a domicilio
    Cuando el sistema calcula el costo de envío
    Entonces se aplica un recargo logístico parametrizable según el peso de la herramienta y la modalidad de entrega o recogida
