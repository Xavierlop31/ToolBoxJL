# language: es
# Fuente: PRD (DOC-PRD-01) §5, Épica 8. TRD §4.1 (Agente 1 — Programador de Rutas).

@Epica8 @Fase2
Característica: Agente 1 — Programador Inteligente de Rutas
  Como negocio, quiero que la ruta diaria de reparto se arme sola cada noche,
  respetando capacidad de vehículo y zona.

  @PrioridadAlta
  Escenario: Batch nocturno genera y publica rutas optimizadas
    Dado que existen pedidos confirmados para el día siguiente sin ruta asignada
    Cuando se ejecuta el batch nocturno del Agente 1
    Entonces el agente consulta los pedidos pendientes vía GET /logistics/pending-orders
    Y evalúa densidad por zona y capacidad de cada vehículo
    Y publica las rutas optimizadas vía POST /logistics/assign-routes antes de las 6:00 a.m.

  @HU-8.2 @PrioridadAlta
  Escenario: Repartidor ve su ruta del día ya optimizada
    Dado que soy un Repartidor iniciando la PWA en la mañana y el Agente 1 ya publicó las rutas del día
    Cuando abro mi ruta asignada
    Entonces la veo ordenada por parada
    Y la ruta respeta el límite de peso/volumen de mi vehículo
