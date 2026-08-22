# language: es
# Fuente: PRD (DOC-PRD-01) §5, Épica 5.

@Epica5 @Fase1
Característica: Devoluciones, Inspección y Facturación de Mora
  Como negocio, necesito verificar el estado de la herramienta al recibirla de
  vuelta y cobrar automáticamente si hay atraso o daño.

  @RF-4.2 @PrioridadAlta
  Escenario: Checklist de inspección detecta un hallazgo y ejecuta la garantía
    Dado que soy Repartidor o Almacenista recibiendo una herramienta devuelta
    Cuando completo el checklist de inspección obligatorio con evidencia fotográfica
    Entonces el sistema registra el resultado del checklist
    Y si el hallazgo es negativo, por daño o pieza faltante, se activa la ejecución parcial o total del depósito de garantía

  @RF-4.1 @PrioridadMedia
  Esquema del escenario: Cliente elige la modalidad de devolución
    Dado que soy un Cliente con una orden activa próxima a vencer
    Cuando elijo la modalidad de devolución "<modalidad>"
    Entonces el resultado es "<resultado>"

    Ejemplos:
      | modalidad            | resultado                                                     |
      | devolución en sede     | no se genera costo logístico adicional                     |
      | recogida a domicilio   | se aplica la tarifa logística configurada                  |

  @RF-4.3 @PrioridadAlta
  Escenario: Cálculo y facturación automática de mora
    Dado que una orden tiene fecha de devolución pactada y esta ya venció sin devolución registrada
    Cuando el MoraCalculatorJob se ejecuta
    Entonces el sistema calcula los días/horas de retraso multiplicados por el interés de mora configurado del modelo
    Y emite inmediatamente un comprobante de cobro pendiente
