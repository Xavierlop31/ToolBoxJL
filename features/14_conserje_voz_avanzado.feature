# language: es
# Fuente: docs/08_PRD_Fase3_Historias_de_Usuario_ToolBoxJL.md, Épica 14.

@Epica14 @Fase3
Característica: Conserje de Voz AI Avanzado
  Como cliente conversando con el Conserje de Voz, quiero un saludo proactivo
  al conectarme y ver en pantalla qué está haciendo el agente mientras
  procesa mi pedido.

  @HU-14.1 @BienvenidaAudio
  Escenario: Reproducción automática del saludo al conectar la sala de voz
    Dado que hago clic en el botón flotante del Conserje de Voz ("Hablar con Conserje")
    Cuando se establece la conexión WebRTC con la sala de LiveKit
    Entonces el agente sintetiza y reproduce inmediatamente un mensaje de bienvenida por audio, sin esperar a que el cliente hable primero
    Y el texto del saludo aparece en el transcript visual del widget.

  @HU-14.2 @ToolCallingFeedback
  Escenario: Visualización de chips de acción en vivo durante la llamada a tools
    Dado que le pido al agente: "Necesito una cortadora de concreto para Bogotá por 4 días"
    Cuando el agente procesa el turno y ejecuta las funciones de backend
    Entonces el widget muestra un chip animado con el nombre de la acción en curso (ej. "Buscando en catálogo…", "Verificando disponibilidad…", "Agregando al carrito…")
    Y al concluir cada llamada, el chip pasa a estado completado
    Y el agente responde por voz con los datos exactos.

  # HU-14.3/14.4: pedido directo del Arquitecto 2026-09-11, no vienen del PRD
  # original de la Épica 14 — hasta acá el widget solo mostraba el saludo
  # (HU-14.1), nunca lo que decía el Cliente ni las respuestas posteriores
  # del agente, y cerrar la sesión nunca llevaba al Cliente a ver su carrito.
  @HU-14.3 @TranscriptConversacional
  Escenario: El widget refleja el diálogo completo, no solo el saludo
    Dado que le pido al agente: "Necesito una cortadora de concreto para Bogotá por 4 días"
    Cuando el agente procesa el turno y ejecuta las funciones de backend
    Entonces mi turno queda registrado en el transcript del widget apenas se transcribe, antes de que el agente termine de responder
    Y la respuesta final del agente también aparece en el transcript, en orden después de mi turno y de los chips de acción.

  @HU-14.4 @NavegacionAlCarrito
  Escenario: Al cerrar el widget tras agregar artículos, el Cliente es llevado a ver su carrito
    Dado que el Agente 3 agregó al menos un artículo a mi carrito durante la sesión de voz
    Cuando cierro el widget de voz porque no voy a agregar nada más
    Entonces se me navega a la página "/carrito"
    Y puedo visualizar ahí los artículos que el agente agregó.
