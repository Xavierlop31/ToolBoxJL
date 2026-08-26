# language: es
# Fuente: PRD (DOC-PRD-01) §5, Épica 10. TRD §4.3 (Agente 3 — Conserje Web).

@Epica10 @Fase2
Característica: Agente 3 — Conserje Web de Búsqueda y Venta por Voz
  Como cliente en el sitio web, quiero poder pedir por voz lo que necesito y
  que se agregue solo al carrito.

  @HU-10.1 @PrioridadAlta
  Escenario: Cliente busca una herramienta por voz con baja latencia
    Dado que soy un Cliente en el sitio web usando el widget de voz
    Cuando le pido por voz una herramienta y por cuántos días la necesito
    Entonces se abre una sesión LiveKit en tiempo real
    Y el agente interpreta mi solicitud, filtra el catálogo y me recomienda una herramienta idónea
    Y la latencia total de la respuesta es menor a 2.5 segundos

  @HU-10.2 @PrioridadAlta
  Escenario: Artículo recomendado se agrega automáticamente al carrito
    Dado que el Agente 3 me recomendó una herramienta por voz
    Cuando confirmo verbalmente que la quiero
    Entonces el agente invoca POST /cart/add-item
    Y confirma verbalmente que el artículo fue agregado a mi carrito
