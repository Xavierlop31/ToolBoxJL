# language: es
# Fuente: PRD (DOC-PRD-01) §5, Épica 9. TRD §4.2 (Agente 2 — Asistente de WhatsApp).

@Epica9 @Fase2
Característica: Agente 2 — Asistente Bidireccional de WhatsApp
  Como cliente, quiero que me recuerden por WhatsApp cuando se acerca la
  devolución y poder reprogramar hablando, sin llamar a nadie.

  @PrioridadAlta
  Escenario: Recordatorio de voz 24 horas antes del vencimiento
    Dado que mi alquiler vence en las próximas 24 horas
    Cuando el WhatsAppReminderJob se ejecuta
    Entonces recibo una nota de voz generada con ElevenLabs TTS por WhatsApp Cloud API recordándome la devolución

  @PrioridadAlta
  Escenario: Cliente extiende su alquiler por voz a través del Agente 2
    Dado que soy un Cliente con un alquiler activo hablando con el Agente 2 por WhatsApp
    Cuando pido por voz que me extiendan el alquiler
    Entonces el agente transcribe mi solicitud con Deepgram STT
    Y consulta disponibilidad futura vía GET /inventory/check-availability
    Y me ofrece pagar la diferencia por link de pago o acumularla a la factura final vía POST /rentals/extend
